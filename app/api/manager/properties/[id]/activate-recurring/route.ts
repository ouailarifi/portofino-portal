import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer, getDefaultPaymentMethod } from "@/lib/stripe-customer";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede dar de alta un cobro" as const, status: 403 as const };
  return {};
}

// El manager da de alta el pago recurrente de una vivienda cuando el cliente
// no lo ha autogestionado (p. ej. alta presencial). Requiere que el cliente
// ya tenga un método de pago guardado (añadido por él o por el manager desde
// "Añadir método de pago"). "Hasta cuándo" se traduce en un cancel_at en la
// suscripción de Stripe cuando se indica fecha de fin; si no se indica, queda
// abierta hasta que se cancele desde Liquidaciones.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { plan, billingMode, monthlyFee, startDate, endDate } = await req.json().catch(() => ({}));
  if (!plan || !billingMode || !monthlyFee || Number(monthlyFee) <= 0 || !startDate) {
    return NextResponse.json({ error: "Faltan datos: plan, modalidad, importe y fecha de inicio son obligatorios" }, { status: 400 });
  }

  const { data: property } = await supabase
    .from("properties")
    .select("id, address, client_id, payment_setup_completed")
    .eq("id", params.id)
    .single();
  if (!property) return NextResponse.json({ error: "Vivienda no encontrada" }, { status: 404 });
  if (property.payment_setup_completed) {
    return NextResponse.json({ error: "Esta vivienda ya tiene el alta de pago completada" }, { status: 400 });
  }

  const { data: clientProfile } = await supabase.from("profiles").select("email").eq("id", property.client_id).single();

  const customerId = await getOrCreateStripeCustomer(supabase, property.client_id, clientProfile?.email);
  const paymentMethodId = await getDefaultPaymentMethod(customerId);
  if (!paymentMethodId) {
    return NextResponse.json({ error: "El cliente no tiene ningún método de pago guardado todavía" }, { status: 400 });
  }

  const startTs = Math.floor(new Date(startDate).getTime() / 1000);
  const endTs = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : null;
  if (endTs && endTs <= startTs) {
    return NextResponse.json({ error: "La fecha de fin debe ser posterior a la de inicio" }, { status: 400 });
  }

  let subscriptionId: string;
  try {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      default_payment_method: paymentMethodId,
      trial_end: startTs > Math.floor(Date.now() / 1000) ? startTs : undefined,
      cancel_at: endTs ?? undefined,
      items: [
        {
          price_data: {
            currency: "eur",
            unit_amount: Math.round(Number(monthlyFee) * (billingMode === "annual" ? 12 : 1) * 100),
            recurring: { interval: billingMode === "annual" ? "year" : "month" },
            product: process.env.STRIPE_MONTHLY_FEE_PRODUCT_ID!,
          },
        },
      ],
      metadata: { property_id: property.id, client_id: property.client_id, payment_concept: "cuota_recurrente_manual" },
    });
    subscriptionId = subscription.id;
  } catch (err: any) {
    return NextResponse.json({ error: `No se pudo crear la suscripción: ${err.message ?? "error de Stripe"}` }, { status: 400 });
  }

  const { error } = await supabase
    .from("properties")
    .update({
      plan,
      billing_mode: billingMode,
      monthly_fee: Number(monthlyFee),
      contract_start_date: startDate,
      payment_setup_completed: true,
      stripe_subscription_id: subscriptionId,
    })
    .eq("id", property.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, subscriptionId });
}
