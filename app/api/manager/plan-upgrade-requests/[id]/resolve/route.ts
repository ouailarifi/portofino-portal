import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede resolver esta petición" as const, status: 403 as const };
  return {};
}

// action "aplicar": cambia el plan de la vivienda al solicitado y marca la
// petición como resuelta. action "descartar": solo la marca como descartada,
// sin tocar el plan actual.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { action } = await req.json().catch(() => ({}));
  if (action !== "aplicar" && action !== "descartar") {
    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }

  const { data: request } = await supabase
    .from("plan_upgrade_requests")
    .select("id, property_id, requested_plan, status")
    .eq("id", params.id)
    .single();
  if (!request) return NextResponse.json({ error: "Petición no encontrada" }, { status: 404 });
  if (request.status !== "pendiente") return NextResponse.json({ error: "Esta petición ya fue resuelta" }, { status: 400 });

  if (action === "aplicar") {
    const { error: planError } = await supabase.from("properties").update({ plan: request.requested_plan }).eq("id", request.property_id);
    if (planError) return NextResponse.json({ error: planError.message }, { status: 400 });
  }

  const { error } = await supabase
    .from("plan_upgrade_requests")
    .update({ status: action === "aplicar" ? "aplicada" : "descartada", resolved_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
