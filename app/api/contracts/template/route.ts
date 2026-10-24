import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generatePlaceholderTemplate } from "@/lib/contract-pdf";

const TEMPLATE_PATH = "plantilla/contrato-tipo.pdf";

// Cualquier cliente autenticado puede descargar la plantilla vigente.
// Si todavía no existe (primer uso), generamos un borrador provisional.
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const service = createServiceClient();
  let { data: signed } = await service.storage.from("contracts").createSignedUrl(TEMPLATE_PATH, 3600);

  if (!signed) {
    const bytes = await generatePlaceholderTemplate();
    await service.storage.from("contracts").upload(TEMPLATE_PATH, bytes, { contentType: "application/pdf", upsert: true });
    const retry = await service.storage.from("contracts").createSignedUrl(TEMPLATE_PATH, 3600);
    signed = retry.data;
  }

  return NextResponse.json({ url: signed?.signedUrl ?? null });
}

// Solo el manager puede sustituir la plantilla por el contrato real revisado legalmente.
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager puede actualizar la plantilla" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.type !== "application/pdf") {
    return NextResponse.json({ error: "Suba un archivo PDF" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const service = createServiceClient();
  const { error } = await service.storage.from("contracts").upload(TEMPLATE_PATH, bytes, { contentType: "application/pdf", upsert: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
