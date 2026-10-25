import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Pago manual: el dinero se transfiere de verdad por banco fuera de la app
// (ver docs/fase9-fichas-y-liquidaciones.md — el pago por Stripe Connect a
// IBAN español no es viable todavía, requiere acceso "private preview" de
// Stripe Treasury for platforms que no tenemos). Este endpoint solo registra
// que el pago ya se ha hecho.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede marcar pagos" }, { status: 403 });

  const { error } = await supabase
    .from("professional_payments")
    .update({ status: "pagado", paid_at: new Date().toISOString() })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
