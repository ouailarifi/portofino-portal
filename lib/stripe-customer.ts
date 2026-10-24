import { stripe } from "@/lib/stripe";

// Lee o crea el customer de Stripe asociado a este usuario (compartido entre
// todas sus viviendas — cada vivienda tiene su propia cuota, pero el método
// de pago y el customer de Stripe son por cliente).
export async function getOrCreateStripeCustomer(supabase: any, userId: string, email: string | undefined) {
  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id as string;

  const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } });
  await supabase.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
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
