import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Elimina un método de pago — nunca si es el único verificado que le queda
// al cliente (confirmado directamente contra Stripe, no contra nuestra BD).
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: "Sin cliente de Stripe" }, { status: 404 });

  const method = await stripe.paymentMethods.retrieve(params.id);
  if (method.customer !== profile.stripe_customer_id) {
    return NextResponse.json({ error: "Este método de pago no pertenece a su cuenta" }, { status: 403 });
  }

  const { data: methods } = await stripe.paymentMethods.list({ customer: profile.stripe_customer_id, type: "card" });
  if (methods.length <= 1) {
    return NextResponse.json(
      { error: "Añada otro método de pago verificado antes de eliminar el último que le queda." },
      { status: 400 }
    );
  }

  await stripe.paymentMethods.detach(params.id);
  return NextResponse.json({ ok: true });
}
