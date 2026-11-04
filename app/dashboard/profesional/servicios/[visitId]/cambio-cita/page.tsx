import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadOwnVisit } from "@/lib/professional-access";
import RescheduleForm from "../../../_components/reschedule-form";

export default async function CambioCitaPage({ params }: { params: { visitId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { visit } = await loadOwnVisit(params.visitId, user.id);
  if (!visit || visit.status !== "programada") notFound();

  return (
    <div>
      <h1 className="pro-title">Cambio de cita</h1>
      <p className="muted" style={{ fontSize: 16, marginBottom: 20 }}>{visit.properties?.address}</p>
      <RescheduleForm visitId={visit.id} currentDate={visit.scheduled_date} />
    </div>
  );
}
