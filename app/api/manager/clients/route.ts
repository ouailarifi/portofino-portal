import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede gestionar clientes" as const, status: 403 as const };
  return { user };
}

function randomPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8).toUpperCase() + "!2";
}

// Crea la cuenta del cliente (necesita la API admin, por eso usa la service role).
// Nota: el domicilio contratado (vivienda) se da de alta aparte, como property,
// y el contrato de colaboración se vincula desde Documentación/firma electrónica
// (no se duplica aquí).
export async function POST(req: Request) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const {
    fullName,
    email,
    email2,
    phone,
    phone2,
    documentType,
    dni,
    secondaryAddress,
    observaciones,
  } = await req.json().catch(() => ({}));
  if (!fullName || !email) return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });

  const service = createServiceClient();

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
    email_2: email2 || null,
    full_name: fullName,
    phone: phone || null,
    phone_2: phone2 || null,
    dni: dni || null,
    document_type: documentType || "dni",
    secondary_address: secondaryAddress || null,
    observaciones: observaciones || null,
    role: "cliente",
  });
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 });

  return NextResponse.json({ ok: true, id: created.user.id, tempPassword });
}
