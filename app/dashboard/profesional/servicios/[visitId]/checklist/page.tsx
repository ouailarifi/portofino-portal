import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOwnVisit } from "@/lib/professional-access";
import { checklistLabelsForPlan, mergeChecklist } from "@/lib/plan-checklist";
import ChecklistForm from "../../../_components/checklist-form";

export default async function ChecklistPage({ params }: { params: { visitId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { service, visit } = await loadOwnVisit(params.visitId, user.id);
  if (!visit) notFound();

  const { data: plans } = await service.from("plans").select("slug, items");
  const items = mergeChecklist(checklistLabelsForPlan(visit.properties?.plan, plans ?? []), visit.checklist);

  const withUrls = await Promise.all(
    items.map(async (it) => {
      const photos = await Promise.all(
        it.photos.map(async (path) => {
          const { data } = await service.storage.from("visit-media").createSignedUrl(path, 3600);
          return { path, url: data?.signedUrl ?? "" };
        })
      );
      return { key: it.key, label: it.label, done: it.done, photos };
    })
  );

  return (
    <div>
      <h1 className="pro-title">Checklist</h1>
      <p className="muted" style={{ fontSize: 16, marginBottom: 20 }}>
        Marque cada punto al revisarlo y haga las fotos que necesite. Al terminar, pulse «Guardar».
      </p>
      <ChecklistForm visitId={visit.id} initial={withUrls} readOnly={visit.status !== "programada"} />
    </div>
  );
}
