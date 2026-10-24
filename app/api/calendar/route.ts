import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSelectable } from "@/lib/calendar";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { propertyId, entryType, weekStart } = await req.json().catch(() => ({}));
  if (!["ocupacion", "visita_preferida"].includes(entryType)) {
    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  }
  if (!propertyId || !weekStart) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  if (!isSelectable(weekStart)) {
    return NextResponse.json({ error: "Debe solicitarlo con al menos una semana de antelación" }, { status: 400 });
  }

  const { data: property } = await supabase.from("properties").select("id, client_id").eq("id", propertyId).single();
  if (!property || property.client_id !== user.id) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const { error } = await supabase.from("property_calendar_entries").insert({
    property_id: propertyId,
    client_id: user.id,
    entry_type: entryType,
    week_start: weekStart,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { propertyId, entryType, weekStart } = await req.json().catch(() => ({}));
  if (!propertyId || !entryType || !weekStart) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { error } = await supabase
    .from("property_calendar_entries")
    .delete()
    .eq("property_id", propertyId)
    .eq("entry_type", entryType)
    .eq("week_start", weekStart)
    .eq("client_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
