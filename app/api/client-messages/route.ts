import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// El cliente escribe un mensaje libre al manager (aparece en la bandeja de
// notificaciones de su ficha). RLS garantiza que solo puede insertar como sí mismo.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { message, propertyId } = await req.json().catch(() => ({}));
  if (!message || !message.trim()) return NextResponse.json({ error: "Escribe un mensaje" }, { status: 400 });

  const { error } = await supabase.from("client_messages").insert({
    client_id: user.id,
    property_id: propertyId || null,
    message: message.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
