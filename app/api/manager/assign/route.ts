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

  return NextResponse.json({ ok: true });
}
