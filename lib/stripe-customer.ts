import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Lee o crea el customer de Stripe asociado a este usuario (compartido entre
// todas sus viviendas — cada vivienda tiene su propia cuota, pero el método
// de pago y el customer de Stripe son por cliente).
//
// IMPORTANTE: guardamos el stripe_customer_id con el cliente de servicio
// (salta RLS). La tabla "profiles" no tiene ninguna política de UPDATE para
// el usuario autenticado ni para el manager — solo tiene SELECT — así que
// guardarlo con el cliente normal fallaba en silencio (sin lanzar error) y
// cada llamada volvía a crear un customer de Stripe nuevo y vacío, dejando
// "Añada antes un método de pago" aunque la tarjeta sí se hubiera guardado
// en el customer anterior.
export async function getOrCreateStripeCustomer(supabase: any, userId: string, email: string | undefined) {
  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id as string;

  const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } });
  const service = createServiceClient();
  const { error } = await service.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  if (error) {
    // No dejamos un customer de Stripe huérfano sin registrar silenciosamente.
    throw new Error(`No se pudo guardar el stripe_customer_id: ${error.message}`);
  }
  return customer.id;
}

// Devuelve el payment method que se debe usar para cobros off-session:
// el default del customer si lo tiene, o el primero de su lista de tarjetas.
export async function getDefaultPaymentMethod(customerId: string) {
  const customer = await stripe.customers.retrieve(customerId);
  const defaultId =
    typeof customer === "object" && !customer.deleted
      ? (customer.invoice_settings?.default_payment_method as string | null)
      : null;
  if (defaultId) return defaultId;

  const methods = await stripe.paymentMethods.list({ customer: customerId, type: "card" });
  return methods.data[0]?.id ?? null;
}
