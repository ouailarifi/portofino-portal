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
  if (profile?.role !== "manager") return { error: "Solo el manager puede cobrar" as const, status: 403 as const };
  return {};
}

// Cobro manual puntual a un cliente (p. ej. el 45% a la firma, el 45% final,
// u otro presupuesto adicional), usando la tarjeta ya guardada del cliente.
export async function POST(req: Request) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { propertyId, concept, amount, quoteId } = await req.json().catch(() => ({}));
  if (!propertyId || !concept || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const { data: property } = await supabase.from("properties").select("id, client_id, address").eq("id", propertyId).single();
  if (!property) return NextResponse.json({ error: "Vivienda no encontrada" }, { status: 404 });

  const { data: clientProfile } = await supabase.from("profiles").select("email").eq("id", property.client_id).single();

  const customerId = await getOrCreateStripeCustomer(supabase, property.client_id, clientProfile?.email);
  const paymentMethodId = await getDefaultPaymentMethod(customerId);
  if (!paymentMethodId) return NextResponse.json({ error: "El cliente no tiene método de pago guardado" }, { status: 400 });

  let intentId: string;
  try {
    const intent = await stripe.paymentIntents.create({
      customer: customerId,
      payment_method: paymentMethodId,
      amount: Math.round(Number(amount) * 100),
      currency: "eur",
      off_session: true,
      confirm: true,
      description: `${concept} — ${property.address}`,
      metadata: { property_id: property.id, client_id: property.client_id, payment_concept: "cobro_manual" },
    });
    intentId = intent.id;
  } catch (err: any) {
    return NextResponse.json({ error: `No se pudo cobrar: ${err.message ?? "pago rechazado"}` }, { status: 400 });
  }

  const { error } = await supabase.from("payments").insert({
    client_id: property.client_id,
    property_id: property.id,
    quote_id_ref: quoteId || null,
    concept,
    amount: Number(amount),
    currency: "eur",
    stripe_payment_intent_id: intentId,
    status: "cobrado",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
