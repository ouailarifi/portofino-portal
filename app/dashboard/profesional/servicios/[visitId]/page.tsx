import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { loadOwnVisit } from "@/lib/professional-access";
import { checklistLabelsForPlan, mergeChecklist } from "@/lib/plan-checklist";
import ServiceButtons from "../../_components/service-buttons";

const fecha = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) : "Sin fecha todavía";

export default async function MiServicioPage({ params }: { params: { visitId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { service, visit } = await loadOwnVisit(params.visitId, user.id);
  if (!visit) notFound();

  // El profesional no puede leer perfiles de clientes con RLS; se lee con el cliente de
  // servicio SOLO el contacto del cliente de ESTA visita (comprobada arriba como suya).
  const admin = createServiceClient();
  const [{ data: client }, { data: plans }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, phone, phone_2, visit_preference, call_preference")
      .eq("id", visit.properties?.client_id)
      .maybeSingle(),
    service.from("plans").select("slug, items"),
  ]);

  const items = mergeChecklist(checklistLabelsForPlan(visit.properties?.plan, plans ?? []), visit.checklist);
  const done = items.filter((i) => i.done).length;

  const tel = (n: string) => (
    <a href={`tel:${n.replace(/\s+/g, "")}`} style={{ color: "var(--navy)", fontSize: 20, fontWeight: 500 }}>
      {n}
    </a>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 17 }}>
        <div>
          <div className="muted" style={{ fontSize: 14 }}>Cliente</div>
          <strong style={{ fontSize: 22 }}>{client?.full_name ?? "—"}</strong>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 14 }}>Dirección</div>
          {visit.properties?.address}
        </div>
        <div>
          <div className="muted" style={{ fontSize: 14 }}>Cita</div>
          {fecha(visit.scheduled_date)}
          {visit.service_number ? ` — ${visit.service_number}` : ""}
        </div>
        <div>
          <div className="muted" style={{ fontSize: 14 }}>Teléfonos</div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
            {client?.phone ? tel(client.phone) : <span className="muted">Sin teléfono</span>}
            {client?.phone_2 && tel(client.phone_2)}
          </div>
        </div>
        <div>
          <div className="muted" style={{ fontSize: 14 }}>Preferencia de visita</div>
          {client?.visit_preference ?? <span className="muted">No indicada</span>}
        </div>
        <div>
          <div className="muted" style={{ fontSize: 14 }}>Preferencia de llamada</div>
          {client?.call_preference ?? <span className="muted">No indicada</span>}
        </div>
      </div>

      <ServiceButtons
        visitId={visit.id}
        status={visit.status}
        arrivedAt={visit.arrived_at}
        checklistDone={done}
        checklistTotal={items.length}
      />
    </div>
  );
}
