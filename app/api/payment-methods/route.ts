import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe-customer";

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
    usage: "off_session", // permite cobrar más adelante (p. ej. penalización por baja) sin que el cliente esté presente
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
