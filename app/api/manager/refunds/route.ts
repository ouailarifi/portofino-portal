import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede reembolsar" }, { status: 403 });

  const { paymentId, amount, reason } = await req.json().catch(() => ({}));
  if (!paymentId) return NextResponse.json({ error: "Falta el pago a reembolsar" }, { status: 400 });

  const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  if (payment.status !== "cobrado") return NextResponse.json({ error: "Este pago no se puede reembolsar" }, { status: 400 });
  if (!payment.stripe_payment_intent_id) return NextResponse.json({ error: "Este pago no tiene cargo de Stripe asociado" }, { status: 400 });

  const refundAmount = amount ? Number(amount) : Number(payment.amount);
  if (refundAmount <= 0 || refundAmount > Number(payment.amount)) {
    return NextResponse.json({ error: "Importe de reembolso no válido" }, { status: 400 });
  }

  let refundId: string;
  try {
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: Math.round(refundAmount * 100),
    });
    refundId = refund.id;
  } catch (err: any) {
    return NextResponse.json({ error: `No se pudo reembolsar: ${err.message ?? "error de Stripe"}` }, { status: 400 });
  }

  await supabase.from("payments").insert({
    client_id: payment.client_id,
    property_id: payment.property_id,
    related_payment_id: payment.id,
    concept: `Reembolso — ${payment.concept}${reason ? ` (${reason})` : ""}`,
    amount: -refundAmount,
    currency: payment.currency,
    stripe_payment_intent_id: refundId,
    status: "reembolsado",
  });

  if (refundAmount >= Number(payment.amount)) {
    await supabase.from("payments").update({ status: "reembolsado" }).eq("id", payment.id);
  }

  return NextResponse.json({ ok: true });
}
