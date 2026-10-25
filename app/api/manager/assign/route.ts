import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const TABLES = {
  quote_request: "quote_requests",
  quote: "quotes",
  visit: "visits",
} as const;

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede asignar" }, { status: 403 });

  const { type, id, professionalId } = await req.json().catch(() => ({}));
  const table = TABLES[type as keyof typeof TABLES];
  if (!table || !id) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const column = type === "visit" ? "professional_id" : "assigned_professional_id";
  const { error } = await supabase.from(table).update({ [column]: professionalId || null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Al asignar un profesional a una visita o a un presupuesto, se le da su
  // número de servicio único (si todavía no lo tenía) — ver decisión 2 en
  // docs/fase9-fichas-y-liquidaciones.md. -01 visita de mantenimiento, -02
  // trabajo por presupuesto fuera de las visitas contratadas.
  if (professionalId && (type === "visit" || type === "quote")) {
    const { data: row } = await supabase.from(table).select("service_number").eq("id", id).single();
    if (row && !row.service_number) {
      const { data: code } = await supabase.rpc("next_service_number", { p_kind: type === "visit" ? "01" : "02" });
      if (code) await supabase.from(table).update({ service_number: code }).eq("id", id);
    }
  }

  return NextResponse.json({ ok: true });
}
