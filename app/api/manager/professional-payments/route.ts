import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede gestionar pagos a profesionales" as const, status: 403 as const };
  return {};
}

export async function POST(req: Request) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { professionalId, concept, amount, quoteId, visitId } = await req.json().catch(() => ({}));
  if (!professionalId || !concept || !amount || Number(amount) <= 0) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const { error } = await supabase.from("professional_payments").insert({
    professional_id: professionalId,
    concept,
    amount: Number(amount),
    quote_id: quoteId || null,
    visit_id: visitId || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
