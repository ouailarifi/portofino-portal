import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede pausar la generación de tickets" as const, status: 403 as const };
  return {};
}

// Pausa/reanuda la generación automática de tickets (visitas) para esta
// vivienda. No afecta a la suscripción/cobro — eso se gestiona aparte con
// payment_paused (ver /api/manager/subscriptions/pause).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { paused } = await req.json().catch(() => ({}));
  if (typeof paused !== "boolean") return NextResponse.json({ error: "Falta el estado" }, { status: 400 });

  const { error } = await supabase.from("properties").update({ ticket_generation_paused: paused }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
