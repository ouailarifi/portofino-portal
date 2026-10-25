import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede gestionar métodos de pago" as const, status: 403 as const };
  return {};
}

// Nunca se puede eliminar si es el único método de pago verificado que le
// queda al cliente (comprobado contra Stripe, igual que en la versión que
// usa el propio cliente).
export async function DELETE(req: Request, { params }: { params: { clientId: string; pmId: string } }) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", params.clientId).single();
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: "Sin cliente de Stripe" }, { status: 404 });

  const method = await stripe.paymentMethods.retrieve(params.pmId);
  if (method.customer !== profile.stripe_customer_id) {
    return NextResponse.json({ error: "Este método de pago no pertenece a este cliente" }, { status: 403 });
  }

  const { data: methods } = await stripe.paymentMethods.list({ customer: profile.stripe_customer_id, type: "card" });
  if (methods.length <= 1) {
    return NextResponse.json(
      { error: "Añada otro método de pago verificado antes de eliminar el último que le queda." },
      { status: 400 }
    );
  }

  await stripe.paymentMethods.detach(params.pmId);
  return NextResponse.json({ ok: true });
}
