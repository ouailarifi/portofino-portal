import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";

// Crea (si no existe) la cuenta Stripe Connect Express del profesional y
// devuelve un enlace de alta/verificación de un solo uso. El profesional
// completa allí sus datos bancarios (IBAN) directamente con Stripe — nunca
// pasan por nuestro servidor ni por nuestra base de datos.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede dar de alta profesionales en Stripe" }, { status: 403 });

  const { data: professional } = await supabase
    .from("profiles")
    .select("id, full_name, email, stripe_connect_account_id")
    .eq("id", params.id)
    .eq("role", "profesional")
    .single();
  if (!professional) return NextResponse.json({ error: "Profesional no encontrado" }, { status: 404 });

  let accountId = professional.stripe_connect_account_id as string | null;

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "ES",
        email: professional.email ?? undefined,
        business_type: "individual",
        capabilities: {
          transfers: { requested: true },
        },
        business_profile: {
          name: professional.full_name ?? undefined,
          product_description: "Servicios de mantenimiento y reforma para Portofino Private Property Management",
        },
      });
      accountId = account.id;
      await supabase.from("profiles").update({ stripe_connect_account_id: accountId, stripe_connect_status: "pendiente" }).eq("id", professional.id);
    }

    const origin = new URL(req.url).origin;
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${origin}/dashboard/manager/profesionales/${professional.id}`,
      return_url: `${origin}/dashboard/manager/profesionales/${professional.id}`,
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "No se pudo generar el enlace de alta en Stripe" }, { status: 400 });
  }
}
