import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede marcar pagos" }, { status: 403 });

  const { data: payment } = await supabase
    .from("professional_payments")
    .select("id, amount, status, concept, professional_id, profiles(stripe_connect_account_id, stripe_connect_status, full_name)")
    .eq("id", params.id)
    .single();
  if (!payment) return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
  if (payment.status === "pagado") return NextResponse.json({ error: "Este pago ya está marcado como pagado" }, { status: 400 });

  const connectAccountId = (payment.profiles as any)?.stripe_connect_account_id as string | undefined;
  if (!connectAccountId) {
    return NextResponse.json(
      { error: "Este profesional todavía no tiene cuenta de Stripe Connect dada de alta. Dalo de alta desde su ficha antes de pagarle." },
      { status: 400 }
    );
  }

  let transferId: string | null = null;
  try {
    const transfer = await stripe.transfers.create({
      amount: Math.round(Number(payment.amount) * 100),
      currency: "eur",
      destination: connectAccountId,
      description: payment.concept ?? "Pago a profesional",
      metadata: { professional_payment_id: payment.id },
    });
    transferId = transfer.id;
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "No se pudo transferir el pago por Stripe" }, { status: 400 });
  }

  const { error } = await supabase
    .from("professional_payments")
    .update({ status: "pagado", paid_at: new Date().toISOString(), stripe_transfer_id: transferId })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
