import { NextResponse } from "next/server";
import { requireProfessional } from "@/lib/professional-access";
import { createServiceClient } from "@/lib/supabase/service";

// Documentos que el propio profesional puede subir (carpeta "Contratación" + certificado bancario de "Datos").
const PRO_DOC_TYPES = [
  "dni",
  "rc_recibo",
  "rc_poliza",
  "certificado_contratistas",
  "contrato_colaboracion",
  "seguridad_social",
  "certificado_bancario",
] as const;

export async function POST(req: Request) {
  const auth = await requireProfessional();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await req.formData();
  const file = form.get("file");
  const docType = form.get("docType");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (typeof docType !== "string" || !(PRO_DOC_TYPES as readonly string[]).includes(docType)) {
    return NextResponse.json({ error: "Tipo de documento no válido" }, { status: 400 });
  }
  if (!(file.type.startsWith("image/") || file.type === "application/pdf")) {
    return NextResponse.json({ error: "Suba una foto o un PDF" }, { status: 400 });
  }

  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const path = `${auth.user.id}/${Date.now()}-${safeName}`;
  const service = createServiceClient();
  const { error: uploadError } = await service.storage.from("professional-documents").upload(path, Buffer.from(await file.arrayBuffer()), {
    contentType: file.type,
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { error } = await service
    .from("professional_documents")
    .insert({ professional_id: auth.user.id, doc_type: docType, label: file.name, storage_path: path });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
