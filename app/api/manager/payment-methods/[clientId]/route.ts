import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe-customer";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede gestionar métodos de pago" as const, status: 403 as const };
  return {};
}

// El manager lista las tarjetas guardadas de un cliente (p. ej. para añadir
// una en persona durante el alta).
export async function GET(req: Request, { params }: { params: { clientId: string } }) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: profile } = await supabase.from("profiles").select("stripe_customer_id").eq("id", params.clientId).single();
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

// Crea un SetupIntent para que el manager añada una tarjeta en nombre del
// cliente (p. ej. en una visita presencial). La tokenización ocurre en el
// navegador vía Stripe Elements — el número de tarjeta nunca pasa por
// nuestro servidor ni se guarda en la base de datos, solo el token de Stripe.
export async function POST(req: Request, { params }: { params: { clientId: string } }) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", params.clientId).single();
  if (!profile) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const customerId = await getOrCreateStripeCustomer(supabase, params.clientId, profile.email);

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    allowed_payment_method_types: ["card"],
    usage: "off_session",
  });

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
