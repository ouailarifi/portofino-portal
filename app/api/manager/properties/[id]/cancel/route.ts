import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { computeCancellation } from "@/lib/cancellation";
import { generateReceiptForPayment } from "@/lib/invoicing";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede dar de baja" as const, status: 403 as const };
  return {};
}

// Baja dada de alta por el manager desde la ficha del cliente, aplicando la
// misma lógica de permanencia/penalización que la baja autogestionada por el
// cliente (ver app/api/properties/[id]/cancel para el equivalente del cliente).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { reason } = await req.json().catch(() => ({ reason: undefined }));

  const { data: property } = await supabase
    .from("properties")
    .select("id, address, plan, billing_mode, contract_start_date, subscription_status, monthly_fee, client_type, client_id")
    .eq("id", params.id)
    .single();
  if (!property) return NextResponse.json({ error: "Vivienda no encontrada" }, { status: 404 });
  if (property.subscription_status !== "activa") {
    return NextResponse.json({ error: "Esta vivienda ya tiene una baja en curso o confirmada" }, { status: 400 });
  }

  const calc = computeCancellation({
    billingMode: property.billing_mode,
    contractStartDate: property.contract_start_date,
    monthlyFee: property.monthly_fee,
    clientType: property.client_type,
  });

  let paymentIntentId: string | null = null;
  if (calc.penaltyAmount > 0) {
    const { data: clientProfile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", property.client_id).single();
    if (!clientProfile?.stripe_customer_id) {
      return NextResponse.json(
        { error: `Hay una penalización de ${money(calc.penaltyAmount)} por baja anticipada, pero el cliente no tiene un método de pago guardado.` },
        { status: 400 }
      );
    }
    const customer = await stripe.customers.retrieve(clientProfile.stripe_customer_id);
    const defaultPM =
      typeof customer === "object" && !customer.deleted ? (customer.invoice_settings?.default_payment_method as string | null) : null;
    const methods = defaultPM ? null : await stripe.paymentMethods.list({ customer: clientProfile.stripe_customer_id, type: "card" });
    const paymentMethodId = defaultPM ?? methods?.data[0]?.id;
    if (!paymentMethodId) {
      return NextResponse.json(
        { error: `Hay una penalización de ${money(calc.penaltyAmount)} por baja anticipada, pero el cliente no tiene un método de pago guardado.` },
        { status: 400 }
      );
    }

    try {
      const intent = await stripe.paymentIntents.create({
        customer: clientProfile.stripe_customer_id,
        payment_method: paymentMethodId,
        amount: Math.round(calc.penaltyAmount * 100),
        currency: "eur",
        off_session: true,
        confirm: true,
        description: `Penalización por baja anticipada (dada de baja por el manager) — ${property.address}`,
        metadata: { property_id: property.id, client_id: property.client_id, payment_concept: "penalizacion_baja" },
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
      cancellation_reason: reason ? `${reason} (dada de baja por el manager)` : "Dada de baja por el manager",
    })
    .eq("id", property.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (paymentIntentId) {
    const { data: paymentRow } = await supabase
      .from("payments")
      .insert({
        client_id: property.client_id,
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

  return NextResponse.json({ ok: true, penaltyAmount: calc.penaltyAmount, effectiveAt: calc.effectiveAt.toISOString() });
}
