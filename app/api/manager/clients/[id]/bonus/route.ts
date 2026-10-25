import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede anotar bonificaciones" as const, status: 403 as const };
  return {};
}

// Bonificación del cliente: texto libre + importe manual opcional, anotado
// por el manager. No se aplica automáticamente a ningún cobro (decisión 3,
// docs/fase9-fichas-y-liquidaciones.md).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { bonusNote, bonusAmount } = await req.json().catch(() => ({}));

  const { error } = await supabase
    .from("profiles")
    .update({
      bonus_note: bonusNote || null,
      bonus_amount: bonusAmount === "" || bonusAmount == null ? null : Number(bonusAmount),
    })
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
