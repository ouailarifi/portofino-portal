import { NextResponse } from "next/server";
import { requireProfessional } from "@/lib/professional-access";
import { createServiceClient } from "@/lib/supabase/service";

// El profesional borra uno de SUS documentos (p. ej. para sustituirlo por uno nuevo).
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProfessional();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const service = createServiceClient();
  const { data: doc } = await service
    .from("professional_documents")
    .select("id, storage_path")
    .eq("id", params.id)
    .eq("professional_id", auth.user.id)
    .maybeSingle();
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  await service.storage.from("professional-documents").remove([doc.storage_path]);
  const { error } = await service.from("professional_documents").delete().eq("id", doc.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
