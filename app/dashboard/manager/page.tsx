import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResolvePlanRequestButtons from "./clientes/[id]/resolve-plan-request-buttons";
import ReviewRescheduleButton from "./review-reschedule-button";
import { FLAG_TEXT, type RescheduleFlag } from "@/lib/reschedule-rules";

const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };
const fechaCorta = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("es-ES") : "sin fecha");

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
function startOfYear() {
  const d = new Date();
  return new Date(d.getFullYear(), 0, 1).toISOString();
}
function startOfWeek() {
  const d = new Date();
  const day = d.getDay() === 0 ? 7 : d.getDay(); // lunes = 1 ... domingo = 7
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().slice(0, 10);
}

export default async function ManagerInicioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "manager") redirect("/dashboard");

  const monthStart = startOfMonth();
  const yearStart = startOfYear();
  const weekStartDate = startOfWeek();
  const monthStartDate = monthStart.slice(0, 10);

  const [
    { count: profesionalesActivos },
    { count: clientesActivos },
    { data: invoicesMes },
    { data: invoicesAnio },
    { count: presupuestosPendientes },
    { data: visitasSemana },
    { data: visitasMes },
    { data: npsRows },
    { count: incidenciasAbiertas },
    { data: planRequests },
    { data: reschedules },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "profesional").eq("status", "activo"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "cliente").eq("status", "activo"),
    supabase.from("invoices").select("total_amount").not("client_id", "is", null).gte("created_at", monthStart),
    supabase.from("invoices").select("total_amount").not("client_id", "is", null).gte("created_at", yearStart),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("status", "pendiente"),
    supabase.from("visits").select("status, scheduled_date, completed_date").or(`scheduled_date.gte.${weekStartDate},completed_date.gte.${weekStartDate}`),
    supabase.from("visits").select("status, scheduled_date, completed_date").or(`scheduled_date.gte.${monthStartDate},completed_date.gte.${monthStartDate}`),
    supabase.from("nps_responses").select("score").gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString()),
    supabase.from("incidents").select("id", { count: "exact", head: true }).eq("status", "abierta"),
    supabase
      .from("plan_upgrade_requests")
      .select("id, current_plan, requested_plan, created_at, client_id, property_id, profiles:client_id(full_name), properties:property_id(address)")
      .eq("status", "pendiente")
      .order("created_at", { ascending: true }),
    // Cambios de cita del profesional que saltaron alguna alerta y siguen sin revisar.
    supabase
      .from("visit_reschedules")
      .select("id, old_date, new_date, flags, reason, created_at, property_id, profiles:professional_id(full_name, codigo_profesional), properties:property_id(address, client_id)")
      .is("reviewed_at", null)
      .not("flags", "eq", "{}")
      .order("created_at", { ascending: true }),
  ]);

  const facturacionMes = (invoicesMes ?? []).reduce((s, i) => s + Number(i.total_amount), 0);
  const facturacionAnio = (invoicesAnio ?? []).reduce((s, i) => s + Number(i.total_amount), 0);
  const ticketMedio = invoicesAnio?.length ? facturacionAnio / invoicesAnio.length : 0;

  const realizadasSemana = (visitasSemana ?? []).filter((v) => v.status === "hecha" && v.completed_date && v.completed_date >= weekStartDate).length;
  const pendientesSemana = (visitasSemana ?? []).filter((v) => v.status === "programada" && v.scheduled_date && v.scheduled_date >= weekStartDate).length;
  const realizadasMes = (visitasMes ?? []).filter((v) => v.status === "hecha" && v.completed_date && v.completed_date >= monthStartDate).length;
  const pendientesMes = (visitasMes ?? []).filter((v) => v.status === "programada" && v.scheduled_date && v.scheduled_date >= monthStartDate).length;

  let npsLabel = "Sin datos todavía";
  if (npsRows && npsRows.length > 0) {
    const promoters = npsRows.filter((r) => r.score >= 9).length;
    const detractors = npsRows.filter((r) => r.score <= 6).length;
    const nps = Math.round(((promoters - detractors) / npsRows.length) * 100);
    npsLabel = `${nps} (${npsRows.length} respuestas, últimos 90 días)`;
  }

  const tiles: { label: string; value: string; hint?: string }[] = [
    { label: "Nº profesionales activos", value: String(profesionalesActivos ?? 0) },
    { label: "Nº clientes activos", value: String(clientesActivos ?? 0) },
    { label: "Facturación este mes", value: money(facturacionMes) },
    { label: "Facturación este año (hasta ahora)", value: money(facturacionAnio) },
    { label: "NPS", value: npsLabel, hint: npsRows?.length ? undefined : "Se activará cuando esté en marcha la encuesta" },
    { label: "Reseñas de Google", value: "Pendiente de conectar", hint: "Fase 2 — integración con Google Business Profile" },
    { label: "Ticket medio", value: money(ticketMedio), hint: "Facturación del año ÷ nº de facturas emitidas" },
    { label: "Nº incidencias abiertas", value: String(incidenciasAbiertas ?? 0) },
    {
      label: "Visitas realizadas vs pendientes (semana)",
      value: `${realizadasSemana} / ${pendientesSemana}`,
    },
    {
      label: "Visitas realizadas vs pendientes (mes)",
      value: `${realizadasMes} / ${pendientesMes}`,
    },
    { label: "Nº presupuestos pendientes", value: String(presupuestosPendientes ?? 0) },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Inicio</h1>
      <p className="muted" style={{ marginBottom: 28 }}>Visión general del negocio</p>

      {!!reschedules?.length && (
        <div className="card" style={{ marginBottom: 24, borderColor: "#c0392b" }}>
          <strong>Citas cambiadas fuera de lo previsto ({reschedules.length})</strong>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {reschedules.map((r: any) => (
              <div key={r.id} className="visit-row" style={{ alignItems: "flex-start", gap: 12 }}>
                <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                  <strong>{r.profiles?.full_name ?? "Profesional"}</strong>
                  {r.profiles?.codigo_profesional ? ` (${r.profiles.codigo_profesional})` : ""}
                  {" movió la visita de "}
                  {r.properties?.client_id ? (
                    <Link href={`/dashboard/manager/clientes/${r.properties.client_id}`}>{r.properties?.address}</Link>
                  ) : (
                    r.properties?.address
                  )}
                  {" del "}
                  <strong>{fechaCorta(r.old_date)}</strong> al <strong>{fechaCorta(r.new_date)}</strong>.
                  <ul style={{ margin: "6px 0 0 18px" }}>
                    {(r.flags as RescheduleFlag[]).map((f) => (
                      <li key={f} className="muted">{FLAG_TEXT[f] ?? f}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 6 }}>
                    <span className="muted">Motivo indicado:</span> {r.reason ?? <em>sin motivo — pídaselo al profesional</em>}
                  </div>
                </div>
                <ReviewRescheduleButton id={r.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {!!planRequests?.length && (
        <div className="card" style={{ marginBottom: 24, borderColor: "var(--gold)" }}>
          <strong>Solicitudes de cambio de plan pendientes ({planRequests.length})</strong>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
            {planRequests.map((r: any) => (
              <div key={r.id} className="visit-row" style={{ alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: 14 }}>
                    <Link href={`/dashboard/manager/clientes/${r.client_id}`}>{r.profiles?.full_name ?? "Cliente"}</Link>
                    {" — "}
                    {r.properties?.address} : <strong>{PLAN_LABEL[r.current_plan] ?? r.current_plan}</strong> → <strong>{PLAN_LABEL[r.requested_plan] ?? r.requested_plan}</strong>
                  </span>
                  <div className="muted" style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString("es-ES")}</div>
                </div>
                <ResolvePlanRequestButtons requestId={r.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 16,
        }}
      >
        {tiles.map((t) => (
          <div key={t.label} className="card" style={{ padding: 22 }}>
            <div className="muted" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
              {t.label}
            </div>
            <div style={{ fontSize: 28, fontFamily: '"Cormorant Garamond", Georgia, serif', color: "var(--ink)" }}>{t.value}</div>
            {t.hint && (
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                {t.hint}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
