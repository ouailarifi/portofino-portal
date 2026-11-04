import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// El manager marca como revisado el aviso de un cambio de cita fuera de reglas.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager" }, { status: 403 });

  const { error } = await supabase.from("visit_reschedules").update({ reviewed_at: new Date().toISOString() }).eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
