import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede gestionar su propia documentación" as const, status: 403 as const };
  return {};
}

// Documentación propia de la empresa: contrato tipo genérico, RC propio,
// recibo de haberlo pagado, y otros documentos (ver sección G de
// docs/fase9-fichas-y-liquidaciones.md).
export async function POST(req: Request) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await req.formData();
  const file = form.get("file");
  const docType = form.get("docType");

  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (typeof docType !== "string" || !["contrato_generico", "rc_propio", "recibo_rc_propio", "otro"].includes(docType)) {
    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${Date.now()}-${file.name}`;
  const service = createServiceClient();
  const { error: uploadError } = await service.storage.from("manager-documents").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { error } = await supabase.from("manager_documents").insert({ doc_type: docType, label: file.name, storage_path: path });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
