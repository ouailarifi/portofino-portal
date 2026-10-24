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
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede pausar cobros" }, { status: 403 });

  const { propertyId, pause } = await req.json().catch(() => ({}));
  const { data: property } = await supabase.from("properties").select("stripe_subscription_id").eq("id", propertyId).single();
  if (!property?.stripe_subscription_id) return NextResponse.json({ error: "Esta vivienda no tiene cuota recurrente" }, { status: 400 });

  try {
    await stripe.subscriptions.update(property.stripe_subscription_id, {
      pause_collection: pause ? { behavior: "void" } : null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "No se pudo actualizar la suscripción" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
