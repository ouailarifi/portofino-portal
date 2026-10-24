import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

async function getOrCreateStripeCustomer(supabase: any, userId: string, email: string | undefined) {
  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", userId).single();
  if (profile?.stripe_customer_id) return profile.stripe_customer_id as string;

  const customer = await stripe.customers.create({ email, metadata: { supabase_user_id: userId } });
  await supabase.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return customer.id;
}

// Lista las tarjetas guardadas en Stripe para este cliente.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  if (!profile?.stripe_customer_id) return NextResponse.json({ methods: [] });

  const [methods, customer] = await Promise.all([
    stripe.paymentMethods.list({ customer: profile.stripe_customer_id, type: "card" }),
    stripe.customers.retrieve(profile.stripe_customer_id),
  ]);

  const defaultId =
    typeof customer === "object" && !customer.deleted
      ? (customer.invoice_settings?.default_payment_method as string | null)
      : null;

  return NextResponse.json({
    methods: methods.data.map((m) => ({
      id: m.id,
      brand: m.card?.brand,
      last4: m.card?.last4,
      expMonth: m.card?.exp_month,
      expYear: m.card?.exp_year,
      isDefault: m.id === defaultId,
    })),
  });
}

// Crea un SetupIntent: Stripe verifica y confirma la tarjeta directamente
// desde el navegador del cliente (nunca pasa por nuestro servidor).
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const customerId = await getOrCreateStripeCustomer(supabase, user.id, user.email);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    allowed_payment_method_types: ["card"],
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
