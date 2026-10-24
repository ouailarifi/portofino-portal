import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Stripe llama aquí directamente (sin sesión de usuario), por eso la firma
// se verifica con STRIPE_WEBHOOK_SECRET y se escribe con la clave de servicio.
export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as any;
    const { quote_id, property_id, client_id, payment_concept } = session.metadata ?? {};

    if (quote_id && client_id) {
      const supabase = createServiceClient();

      await supabase
        .from("quotes")
        .update({
          status: "aceptado",
          responded_at: new Date().toISOString(),
          deposit_payment_intent_id: session.payment_intent,
        })
        .eq("id", quote_id)
        .eq("status", "pendiente");

      await supabase.from("payments").insert({
        client_id,
        property_id,
        quote_id,
        concept: payment_concept === "compromiso_10" ? "Compromiso de obra (10%)" : "Pago",
        amount: (session.amount_total ?? 0) / 100,
        currency: session.currency ?? "eur",
        stripe_payment_intent_id: session.payment_intent,
        status: "cobrado",
      });

      // Guarda el id de cliente de Stripe la primera vez, para listar sus cobros más adelante.
      if (session.customer) {
        await supabase.from("profiles").update({ stripe_customer_id: session.customer }).eq("id", client_id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
