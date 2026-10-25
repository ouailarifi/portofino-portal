import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede gestionar documentos" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const professionalId = form.get("professionalId");
  const docType = form.get("docType");

  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (typeof professionalId !== "string" || typeof docType !== "string") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (!["rc_poliza", "rc_recibo", "dni", "dni_anverso", "dni_reverso", "contrato_colaboracion", "certificado_contratistas", "certificado_bancario", "foto", "otro"].includes(docType)) {
    return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${professionalId}/${Date.now()}-${file.name}`;
  const service = createServiceClient();
  const { error: uploadError } = await service.storage.from("professional-documents").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { error } = await supabase.from("professional_documents").insert({
    professional_id: professionalId,
    doc_type: docType,
    label: file.name,
    storage_path: path,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
