import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Crea la sesión de pago del 10% de compromiso. El presupuesto NO se marca
// como aceptado aquí — eso solo ocurre cuando Stripe confirma el cobro
// (webhook /api/stripe/webhook), para no dar por aceptado algo que no se ha pagado.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: quote } = await supabase
    .from("quotes")
    .select("id, title, amount_total, status, property_id, properties(address, client_id)")
    .eq("id", params.id)
    .single();

  const property = Array.isArray(quote?.properties) ? quote?.properties[0] : (quote as any)?.properties;

  if (!quote || property?.client_id !== user.id) {
    return NextResponse.json({ error: "Presupuesto no encontrado" }, { status: 404 });
  }
  if (quote.status !== "pendiente") {
    return NextResponse.json({ error: "Este presupuesto ya ha sido respondido" }, { status: 400 });
  }

  const depositCents = Math.round(quote.amount_total * 0.10 * 100);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://${req.headers.get("host")}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: depositCents,
          product_data: {
            name: `Compromiso de obra (10%) — ${quote.title}`,
            description: `Vivienda: ${property?.address ?? ""}. Importe no reembolsable transcurridas 24h.`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      quote_id: quote.id,
      property_id: quote.property_id,
      client_id: user.id,
      payment_concept: "compromiso_10",
    },
    success_url: `${siteUrl}/dashboard/presupuestos?pago=ok`,
    cancel_url: `${siteUrl}/dashboard/presupuestos?pago=cancelado`,
  });

  return NextResponse.json({ url: session.url });
}
