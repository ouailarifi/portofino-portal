import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireManager(supabase: ReturnType<typeof createClient>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "No autenticado" as const, status: 401 as const };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return { error: "Solo el manager puede gestionar documentos" as const, status: 403 as const };
  return { user };
}

export async function POST(req: Request) {
  const supabase = createClient();
  const auth = await requireManager(supabase);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await req.formData();
  const file = form.get("file");
  const clientId = form.get("clientId");
  const docType = form.get("docType");
  const propertyId = form.get("propertyId");

  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (typeof clientId !== "string" || typeof docType !== "string") {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  if (!["dni", "escrituras", "otro"].includes(docType)) return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${clientId}/${Date.now()}-${file.name}`;
  const service = createServiceClient();
  const { error: uploadError } = await service.storage.from("client-documents").upload(path, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { error } = await supabase.from("client_documents").insert({
    client_id: clientId,
    property_id: typeof propertyId === "string" && propertyId ? propertyId : null,
    doc_type: docType,
    label: file.name,
    storage_path: path,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
