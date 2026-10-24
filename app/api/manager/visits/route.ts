import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede programar visitas" }, { status: 403 });

  const { propertyId, scheduledDate } = await req.json().catch(() => ({}));
  if (!propertyId || !scheduledDate) return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });

  const { error } = await supabase.from("visits").insert({
    property_id: propertyId,
    scheduled_date: scheduledDate,
    status: "programada",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
