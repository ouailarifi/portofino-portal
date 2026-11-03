import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// El informe en PDF de cada visita lo sube el manager manualmente (no hay
// app de profesional todavía que lo genere). Un único PDF por visita.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede subir informes" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  const summary = form.get("summary");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "El informe debe ser un PDF" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const path = `${params.id}/${Date.now()}-${file.name}`;
  const service = createServiceClient();
  const { error: uploadError } = await service.storage.from("visit-reports").upload(path, bytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { error } = await supabase.from("visit_reports").insert({
    visit_id: params.id,
    storage_path: path,
    summary: typeof summary === "string" && summary ? summary : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
