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

  // Cuotas mensuales recurrentes (suscripción creada en /api/properties/[id]/activar-pago)
  if (event.type === "invoice.payment_succeeded" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object as any;
    const subscriptionId = invoice.subscription as string | null;
    if (subscriptionId) {
      const supabase = createServiceClient();
      const { data: property } = await supabase
        .from("properties")
        .select("id, address, client_id")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle();

      if (property) {
        if (event.type === "invoice.payment_succeeded") {
          await supabase.from("payments").insert({
            client_id: property.client_id,
            property_id: property.id,
            concept: "Cuota mensual",
            amount: (invoice.amount_paid ?? 0) / 100,
            currency: invoice.currency ?? "eur",
            stripe_payment_intent_id: invoice.payment_intent ?? invoice.id,
            status: "cobrado",
          });
        } else if (process.env.RESEND_API_KEY) {
          const { data: profile } = await supabase.from("profiles").select("email").eq("id", property.client_id).single();
          const notify = async (to: string) => {
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                from: process.env.RESEND_FROM_EMAIL ?? "Portofino <notificaciones@portofino.com>",
                to,
                subject: `Cobro fallido — ${property.address}`,
                text: `No se pudo cobrar la cuota mensual de ${property.address}. Revise el método de pago en Configuración.`,
              }),
            }).catch(() => {});
          };
          if (profile?.email) await notify(profile.email);
          if (process.env.MANAGER_NOTIFICATION_EMAIL) await notify(process.env.MANAGER_NOTIFICATION_EMAIL);
        }
      }
    }
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
