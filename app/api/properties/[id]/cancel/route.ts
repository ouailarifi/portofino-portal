import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { computeCancellation } from "@/lib/cancellation";
import { generateReceiptForPayment } from "@/lib/invoicing";

const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };
const fecha = (d: Date) => d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
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
    // Un fallo en el envío no debe romper la baja ya registrada.
  }
}

async function loadProperty(supabase: any, id: string) {
  const { data } = await supabase
    .from("properties")
    .select("id, address, plan, billing_mode, contract_start_date, subscription_status, monthly_fee, client_type, client_id")
    .eq("id", id)
    .single();
  return data;
}

// Paso 1: solo calcula y devuelve la información de permanencia y penalización, sin confirmar nada.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const property = await loadProperty(supabase, params.id);
  if (!property) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const calc = computeCancellation({
    billingMode: property.billing_mode,
    contractStartDate: property.contract_start_date,
    monthlyFee: property.monthly_fee,
    clientType: property.client_type,
  });

  return NextResponse.json({
    address: property.address,
    plan: property.plan,
    billingMode: property.billing_mode,
    subscriptionStatus: property.subscription_status,
    insideCommitment: calc.insideCommitment,
    commitmentEnd: calc.commitmentEnd?.toISOString() ?? null,
    penaltyAmount: calc.penaltyAmount,
    penaltyRatePct: Math.round(calc.rate * 100),
    remainingMonths: calc.remainingMonths,
    monthlyFee: property.monthly_fee,
  });
}

// Paso 2: confirma la baja. Si hay penalización, se cobra de inmediato con el método de
// pago guardado del cliente. Avisa por email a cliente y manager con todas las condiciones.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { reason } = await req.json().catch(() => ({ reason: undefined }));

  const property = await loadProperty(supabase, params.id);
  if (!property) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (property.subscription_status !== "activa") {
    return NextResponse.json({ error: "Esta vivienda ya tiene una baja en curso o confirmada" }, { status: 400 });
  }

  const calc = computeCancellation({
    billingMode: property.billing_mode,
    contractStartDate: property.contract_start_date,
    monthlyFee: property.monthly_fee,
    clientType: property.client_type,
  });

  // Si hay penalización, se cobra antes de confirmar la baja — si el cobro falla, no se da de baja.
  let paymentIntentId: string | null = null;
  if (calc.penaltyAmount > 0) {
    const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: `Hay una penalización de ${money(calc.penaltyAmount)} por baja anticipada. Añada un método de pago en Configuración antes de continuar.` },
        { status: 400 }
      );
    }
    const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
    const defaultPM =
      typeof customer === "object" && !customer.deleted ? (customer.invoice_settings?.default_payment_method as string | null) : null;
    const methods = defaultPM ? null : await stripe.paymentMethods.list({ customer: profile.stripe_customer_id, type: "card" });
    const paymentMethodId = defaultPM ?? methods?.data[0]?.id;

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: `Hay una penalización de ${money(calc.penaltyAmount)} por baja anticipada. Añada un método de pago en Configuración antes de continuar.` },
        { status: 400 }
      );
    }

    try {
      const intent = await stripe.paymentIntents.create({
        customer: profile.stripe_customer_id,
        payment_method: paymentMethodId,
        amount: Math.round(calc.penaltyAmount * 100),
        currency: "eur",
        off_session: true,
        confirm: true,
        description: `Penalización por baja anticipada — ${property.address}`,
        metadata: { property_id: property.id, client_id: user.id, payment_concept: "penalizacion_baja" },
      });
      paymentIntentId = intent.id;
    } catch (err: any) {
      return NextResponse.json(
        { error: `No se pudo cobrar la penalización de ${money(calc.penaltyAmount)}: ${err.message ?? "pago rechazado"}` },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase
    .from("properties")
    .update({
      subscription_status: "baja_solicitada",
      cancellation_requested_at: new Date().toISOString(),
      cancellation_effective_at: calc.effectiveAt.toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (paymentIntentId) {
    const { data: paymentRow } = await supabase
      .from("payments")
      .insert({
        client_id: user.id,
        property_id: property.id,
        concept: "Penalización por baja anticipada",
        amount: calc.penaltyAmount,
        currency: "eur",
        stripe_payment_intent_id: paymentIntentId,
        status: "cobrado",
      })
      .select("id")
      .single();
    if (paymentRow) {
      try {
        await generateReceiptForPayment(paymentRow.id);
      } catch {
        // Un fallo al generar/enviar el recibo no debe romper el cobro ya hecho.
      }
    }
  }

  const resumen = [
    `Vivienda: ${property.address}`,
    `Plan: ${PLAN_LABEL[property.plan] ?? property.plan}`,
    `Facturación: ${property.billing_mode === "annual" ? "anual" : "flexible"}`,
    `Tipo de cliente: ${property.client_type === "empresa" ? "empresa" : "particular"}`,
    `Fecha de solicitud: ${fecha(new Date())}`,
    calc.insideCommitment
      ? calc.penaltyAmount > 0
        ? `Dentro del periodo de permanencia (hasta el ${fecha(calc.commitmentEnd!)}). Deducción aplicada: ${Math.round(calc.rate * 100)}% de las ${calc.remainingMonths} cuotas no devengadas = ${money(calc.penaltyAmount)}${paymentIntentId ? " (cobrada)" : ""}.`
        : `Baja dentro de los 3 primeros meses (periodo de prueba): sin penalización. Solo se mantienen las cuotas de los meses ya transcurridos.`
      : `Sin compromiso de permanencia pendiente. Sin penalización. La baja es efectiva de inmediato.`,
    reason ? `Motivo indicado por el cliente: ${reason}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const subject = `Baja solicitada — ${property.address}`;
  if (user.email) await sendEmail(user.email, subject, `Confirmamos su solicitud de baja de Portofino.\n\n${resumen}`);
  if (process.env.MANAGER_NOTIFICATION_EMAIL) {
    await sendEmail(process.env.MANAGER_NOTIFICATION_EMAIL, subject, `${user.email} ha solicitado la baja de una vivienda.\n\n${resumen}`);
  }

  return NextResponse.json({ ok: true, penaltyAmount: calc.penaltyAmount, effectiveAt: calc.effectiveAt.toISOString() });
}
