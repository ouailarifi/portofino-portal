import { NextResponse } from "next/server";
import { requireProfessional, loadOwnVisit } from "@/lib/professional-access";
import { checklistLabelsForPlan, mergeChecklist } from "@/lib/plan-checklist";

// Guarda un punto de la checklist: marcar/desmarcar y/o adjuntar la foto del punto.
// FormData: key (obligatorio), done ("1"/"0", opcional), file (imagen, opcional).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProfessional();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const form = await req.formData();
  const key = form.get("key");
  const done = form.get("done");
  const file = form.get("file");
  if (typeof key !== "string") return NextResponse.json({ error: "Falta el punto" }, { status: 400 });

  const { service, visit } = await loadOwnVisit(params.id, auth.user.id);
  if (!visit) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  if (visit.status !== "programada") return NextResponse.json({ error: "Este servicio ya está cerrado" }, { status: 400 });

  const { data: plans } = await service.from("plans").select("slug, items");
  const items = mergeChecklist(checklistLabelsForPlan(visit.properties?.plan, plans ?? []), visit.checklist);
  const item = items.find((i) => i.key === key);
  if (!item) return NextResponse.json({ error: "Punto no válido" }, { status: 400 });

  if (typeof done === "string") item.done = done === "1";

  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Adjunte una foto" }, { status: 400 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const path = `${visit.id}/checklist/${key}-${Date.now()}.jpg`;
    const { error: uploadError } = await service.storage.from("visit-media").upload(path, bytes, {
      contentType: file.type || "image/jpeg",
      upsert: true,
    });
    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });
    if (item.photo_path) await service.storage.from("visit-media").remove([item.photo_path]);
    item.photo_path = path;
    item.done = true; // subir la foto del punto lo da por revisado
  }

  const { error } = await service.from("visits").update({ checklist: items }).eq("id", visit.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, item });
}
