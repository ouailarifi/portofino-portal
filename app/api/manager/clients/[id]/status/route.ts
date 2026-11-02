import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = ["activo", "pausado", "inactivo"];

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede gestionar clientes" as const, status: 403 as const };
  return {};
}

// Alta/baja/pausa del ACCESO del cliente (login). No toca el contrato/suscripción
// de sus viviendas, que se gestiona aparte en /api/manager/properties/[id]/cancel.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { status } = await req.json().catch(() => ({}));
  if (!ALLOWED.includes(status)) return NextResponse.json({ error: "Estado no válido" }, { status: 400 });

  const { error } = await supabase.from("profiles").update({ status }).eq("id", params.id).eq("role", "cliente");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
