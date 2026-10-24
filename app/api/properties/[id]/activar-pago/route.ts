import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer, getDefaultPaymentMethod } from "@/lib/stripe-customer";

const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };
const ALTA_FLEXIBLE_CENTS = 12000; // 120€ fijos de alta en modalidad Flexible

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

async function sendEmail(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "Portofino <notificaciones@portofino.com>",
        to,
        subject,
        text,
      }),
    });
  } catch {
    // Un fallo en el envío no debe romper la alta ya cobrada.
  }
}

async function loadProperty(supabase: any, id: string) {
  const { data } = await supabase
    .from("properties")
    .select("id, address, plan, billing_mode, monthly_fee, payment_setup_completed, client_id")
    .eq("id", id)
    .single();
  return data;
}

function computeAmountCents(billingMode: string, monthlyFee: number | null) {
  if (billingMode === "annual") {
    return Math.round((monthlyFee ?? 0) * 12 * 100);
  }
  return ALTA_FLEXIBLE_CENTS;
}

// Paso 1: info para pintar la pantalla de alta (importe que se va a cobrar).
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const property = await loadProperty(supabase, params.id);
  if (!property || property.client_id !== user.id) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const amountCents = computeAmountCents(property.billing_mode, property.monthly_fee);

  return NextResponse.json({
    address: property.address,
    plan: property.plan,
    billingMode: property.billing_mode,
    monthlyFee: property.monthly_fee,
    amount: amountCents / 100,
    alreadyDone: property.payment_setup_completed,
  });
}

// Paso 2: cobra el alta inicial con la tarjeta ya guardada y, si el plan es
// Flexible, deja programada la cuota mensual recurrente en Stripe.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const property = await loadProperty(supabase, params.id);
  if (!property || property.client_id !== user.id) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (property.payment_setup_completed) {
    return NextResponse.json({ error: "Esta vivienda ya tiene el alta de pago completada" }, { status: 400 });
  }

  const customerId = await getOrCreateStripeCustomer(supabase, user.id, user.email);
  const paymentMethodId = await getDefaultPaymentMethod(customerId);
  if (!paymentMethodId) {
    return NextResponse.json({ error: "Añada antes un método de pago" }, { status: 400 });
  }

  // La tarjeta recién guardada puede no ser aún la default del customer — la fijamos.
  await stripe.customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });

  const amountCents = computeAmountCents(property.billing_mode, property.monthly_fee);
  const concept = property.billing_mode === "annual" ? "Pago anual inicial" : "Alta inicial";

  let intentId: string;
  try {
    const intent = await stripe.paymentIntents.create({
      customer: customerId,
      payment_method: paymentMethodId,
      amount: amountCents,
      currency: "eur",
      off_session: true,
      confirm: true,
      description: `${concept} — ${property.address}`,
      metadata: { property_id: property.id, client_id: user.id, payment_concept: "alta_inicial" },
    });
    intentId = intent.id;
  } catch (err: any) {
    return NextResponse.json({ error: `No se pudo cobrar el alta: ${err.message ?? "pago rechazado"}` }, { status: 400 });
  }

  // Flexible: la alta es un cargo único; a partir de ahí la cuota mensual se
  // cobra sola via una suscripción de Stripe (empieza al mes siguiente, para
  // no duplicar el cobro de este primer mes con la alta).
  let subscriptionId: string | null = null;
  if (property.billing_mode !== "annual" && property.monthly_fee) {
    const trialEnd = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      default_payment_method: paymentMethodId,
      trial_end: trialEnd,
      items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: Math.round(property.monthly_fee * 100),
            recurring: { interval: "month" },
            product: process.env.STRIPE_MONTHLY_FEE_PRODUCT_ID!,
          },
        },
      ],
      metadata: { property_id: property.id, client_id: user.id, payment_concept: "cuota_recurrente" },
    });
    subscriptionId = subscription.id;
  }

  await supabase
    .from("properties")
    .update({
      payment_setup_completed: true,
      initial_payment_intent_id: intentId,
      stripe_subscription_id: subscriptionId,
    })
    .eq("id", property.id);

  await supabase.from("payments").insert({
    client_id: user.id,
    property_id: property.id,
    concept,
    amount: amountCents / 100,
    currency: "eur",
    stripe_payment_intent_id: intentId,
    status: "cobrado",
  });

  const resumen = [
    `Vivienda: ${property.address}`,
    `Plan: ${PLAN_LABEL[property.plan] ?? property.plan}`,
    `Facturación: ${property.billing_mode === "annual" ? "anual" : "flexible"}`,
    `${concept}: ${money(amountCents / 100)} (cobrado)`,
    subscriptionId ? "Cuota mensual recurrente programada a partir del mes que viene." : null,
  ]
    .filter(Boolean)
    .join("\n");

  const subject = `Alta de pago completada — ${property.address}`;
  if (user.email) await sendEmail(user.email, subject, `Confirmamos el alta de pago de su vivienda en Portofino.\n\n${resumen}`);
  if (process.env.MANAGER_NOTIFICATION_EMAIL) {
    await sendEmail(process.env.MANAGER_NOTIFICATION_EMAIL, subject, `${user.email} ha completado el alta de pago.\n\n${resumen}`);
  }

  return NextResponse.json({ ok: true, amountCharged: amountCents / 100, subscriptionCreated: !!subscriptionId });
}
