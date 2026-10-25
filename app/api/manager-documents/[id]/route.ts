import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") return NextResponse.json({ error: "Solo el manager" }, { status: 403 });

  const { data: doc } = await supabase.from("manager_documents").select("storage_path").eq("id", params.id).single();
  if (!doc) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const service = createServiceClient();
  await service.storage.from("manager-documents").remove([doc.storage_path]);

  const { error } = await supabase.from("manager_documents").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
