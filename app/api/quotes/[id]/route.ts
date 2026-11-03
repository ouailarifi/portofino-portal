import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// El cliente puede eliminar un presupuesto si se equivocó o se arrepintió,
// salvo que ya esté aceptado Y cobrado (el depósito ya se ha retenido con
// Stripe) — en ese caso ya hay un compromiso real y debe gestionarlo con
// el manager. RLS solo permite insertar/editar/borrar presupuestos al
// manager, así que validamos la regla aquí y usamos el cliente de servicio.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // RLS ya garantiza que solo se puede leer un presupuesto propio (o si es manager/profesional).
  const { data: quote } = await supabase.from("quotes").select("id, status, property_id").eq("id", params.id).single();
  if (!quote) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { data: property } = await supabase.from("properties").select("client_id").eq("id", quote.property_id).single();
  if (!property || property.client_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (quote.status === "aceptado") {
    const { data: paid } = await supabase
      .from("payments")
      .select("id")
      .eq("quote_id", params.id)
      .eq("status", "cobrado")
      .maybeSingle();
    if (paid) {
      return NextResponse.json({ error: "No se puede eliminar un presupuesto ya aceptado y cobrado" }, { status: 400 });
    }
  }

  const service = createServiceClient();
  const { error } = await service.from("quotes").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
