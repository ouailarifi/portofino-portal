import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GREMIO_LABEL: Record<string, string> = {
  carpinteria_madera: "Carpintería de madera",
  albanileria_reforma: "Albañilería / reforma",
  cristaleria: "Cristalería",
  carpinteria_metalica: "Carpintería metálica",
  reforma_general: "Reforma general",
};

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede registrar solicitudes" }, { status: 403 });

  const { clientId, propertyId, gremio, canal, description } = await req.json().catch(() => ({}));

  if (!clientId) return NextResponse.json({ error: "Falta el cliente" }, { status: 400 });
  if (!GREMIO_LABEL[gremio]) return NextResponse.json({ error: "Gremio no válido" }, { status: 400 });
  if (!["email", "telefono", "otro"].includes(canal)) return NextResponse.json({ error: "Canal no válido" }, { status: 400 });
  if (!description || !description.trim()) return NextResponse.json({ error: "Falta la descripción" }, { status: 400 });

  const { error } = await supabase.from("quote_requests").insert({
    client_id: clientId,
    property_id: propertyId || null,
    gremio,
    canal,
    description: description.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
