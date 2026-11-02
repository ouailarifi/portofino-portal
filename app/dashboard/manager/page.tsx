import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
