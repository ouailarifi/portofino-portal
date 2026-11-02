import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede crear presupuestos" }, { status: 403 });

  const { quoteRequestId, propertyId, title, description, amountTotal, assignedProfessionalId } = await req.json().catch(() => ({}));

  if (!propertyId) return NextResponse.json({ error: "Falta la vivienda" }, { status: 400 });
  if (!title || !title.trim()) return NextResponse.json({ error: "Falta el título" }, { status: 400 });
  const amount = Number(amountTotal);
  if (!amount || amount <= 0) return NextResponse.json({ error: "Importe no válido" }, { status: 400 });

  const { error } = await supabase.from("quotes").insert({
    property_id: propertyId,
    title: title.trim(),
    description: description?.trim() || null,
    amount_total: amount,
    assigned_professional_id: assignedProfessionalId || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (quoteRequestId) {
    await supabase.from("quote_requests").update({ status: "contactado" }).eq("id", quoteRequestId);
  }

  return NextResponse.json({ ok: true });
}
