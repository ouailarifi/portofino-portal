import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOwnVisit } from "@/lib/professional-access";
import IncidentForm from "../../../_components/incident-form";

export default async function IncidenciaPage({ params }: { params: { visitId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { visit } = await loadOwnVisit(params.visitId, user.id);
  if (!visit) notFound();

  return (
    <div>
      <h1 className="pro-title">Incidencia</h1>
      <p className="muted" style={{ fontSize: 16, marginBottom: 20 }}>{visit.properties?.address}</p>
      <IncidentForm visitId={visit.id} />
    </div>
  );
}
