import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede gestionar profesionales" as const, status: 403 as const };
  return { user };
}

function randomPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8).toUpperCase() + "!2";
}

export async function GET() {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, dni, codigo_profesional, gremio")
    .eq("role", "profesional")
    .order("codigo_profesional", { ascending: true });

  return NextResponse.json({ professionals: data ?? [] });
}

// Crea la cuenta del profesional (necesita la API admin, por eso usa la service role).
export async function POST(req: Request) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { fullName, email, phone, gremio, dni, documentType, fiscalAddress, observaciones } = await req.json().catch(() => ({}));
  if (!fullName || !email) return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });

  const service = createServiceClient();

  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "profesional");
  const codigo = `PRO-${String((count ?? 0) + 1).padStart(4, "0")}`;

  const tempPassword = randomPassword();
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createError || !created?.user) {
    return NextResponse.json({ error: createError?.message ?? "No se pudo crear la cuenta" }, { status: 400 });
  }

  const { error: profileError } = await service.from("profiles").insert({
    id: created.user.id,
    email,
    full_name: fullName,
    phone: phone || null,
    dni: dni || null,
    document_type: documentType || "dni",
    fiscal_address: fiscalAddress || null,
    observaciones: observaciones || null,
    gremio: gremio || null,
    codigo_profesional: codigo,
    role: "profesional",
  });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: created.user.id, codigo, tempPassword });
}
