import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// El cliente indica cuándo y cómo prefiere que le visiten/llamen. El profesional lo ve en cada servicio.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const clean = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null);

  // "profiles" solo tiene política RLS de SELECT: el UPDATE va con el cliente de servicio.
  const service = createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ visit_preference: clean(body.visitPreference), call_preference: clean(body.callPreference) })
    .eq("id", user.id)
    .eq("role", "cliente");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
