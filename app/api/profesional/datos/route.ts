import { NextResponse } from "next/server";
import { requireProfessional } from "@/lib/professional-access";
import { createServiceClient } from "@/lib/supabase/service";

// Datos de contacto y fiscales que el profesional puede editar. Lista cerrada:
// nunca se aceptan role, status, email de acceso ni ningún otro campo.
export async function POST(req: Request) {
  const auth = await requireProfessional();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 200) : null);

  const phone = clean(body.phone);
  if (!phone) return NextResponse.json({ error: "El teléfono 1 es obligatorio" }, { status: 400 });

  // "profiles" solo tiene política RLS de SELECT: el UPDATE va con el cliente de servicio.
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ phone, phone_2: clean(body.phone2), fiscal_address: clean(body.fiscalAddress) })
    .eq("id", auth.user.id)
    .eq("role", "profesional");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
