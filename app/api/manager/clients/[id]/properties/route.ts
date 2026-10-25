import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede dar de alta viviendas" as const, status: 403 as const };
  return {};
}

const PLANS = ["essential", "comfort", "premium"];
const BILLING_MODES = ["annual", "flexible"];
const CLIENT_TYPES = ["particular", "empresa"];
const PROPERTY_TYPES = ["apartment", "house", "villa", "luxury_villa"];

// Da de alta el domicilio contratado (vivienda) de un cliente. El cobro
// recurrente se activa aparte, desde el bloque de Liquidaciones de la ficha
// del cliente (ActivateRecurringForm), una vez la vivienda ya existe.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const {
    address,
    propertyType,
    zone,
    plan,
    billingMode,
    monthlyFee,
    clientType,
    contractStartDate,
  } = await req.json().catch(() => ({}));

  if (!address || !address.trim()) return NextResponse.json({ error: "La dirección es obligatoria" }, { status: 400 });
  if (!PROPERTY_TYPES.includes(propertyType)) return NextResponse.json({ error: "Tipo de vivienda no válido" }, { status: 400 });
  if (!PLANS.includes(plan)) return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
  if (!BILLING_MODES.includes(billingMode)) return NextResponse.json({ error: "Modalidad de facturación no válida" }, { status: 400 });
  if (!CLIENT_TYPES.includes(clientType)) return NextResponse.json({ error: "Tipo de cliente no válido" }, { status: 400 });
  if (monthlyFee != null && monthlyFee !== "" && Number(monthlyFee) < 0) {
    return NextResponse.json({ error: "La cuota mensual no puede ser negativa" }, { status: 400 });
  }

  const { data: client } = await supabase.from("profiles").select("id, role").eq("id", params.id).single();
  if (!client || client.role !== "cliente") return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      client_id: params.id,
      address: address.trim(),
      property_type: propertyType,
      zone: zone || null,
      plan,
      billing_mode: billingMode,
      monthly_fee: monthlyFee === "" || monthlyFee == null ? null : Number(monthlyFee),
      client_type: clientType,
      contract_start_date: contractStartDate || new Date().toISOString().slice(0, 10),
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: property.id });
}
