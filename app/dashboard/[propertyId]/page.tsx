import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import IncidentConsent from "./incident-consent";

const STATUS_LABEL: Record<string, string> = {
  programada: "Programada",
  hecha: "Realizada",
  fallida: "No realizada",
};

function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = date.getDay() === 0 ? 7 : date.getDay(); // lunes = 1 ... domingo = 7
  date.setDate(date.getDate() - (day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
}

const MONTH_LABEL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default async function PropertyVisitsPage({
  params,
}: {
  params: { propertyId: string };
}) {
  const supabase = createClient();

  const { data: property } = await supabase
    .from("properties")
    .select("id, address")
    .eq("id", params.propertyId)
    .single();

  if (!property) notFound(); // RLS ya impide ver viviendas ajenas: esto cubre el 404 normal.

  const { data: visits } = await supabase
    .from("visits")
    .select("id, scheduled_date, completed_date, status, service_number")
    .eq("property_id", params.propertyId)
    .order("scheduled_date", { ascending: false });

  const now = new Date();
  const weekStart = startOfWeek(now);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const dateOf = (v: { completed_date: string | null; scheduled_date: string | null }) =>
    v.completed_date ? new Date(v.completed_date) : v.scheduled_date ? new Date(v.scheduled_date) : null;

  const visitasEstaSemana = (visits ?? []).filter((v) => {
    const d = dateOf(v);
    return d && d >= weekStart;
  }).length;
  const visitasEsteMes = (visits ?? []).filter((v) => {
    const d = dateOf(v);
    return d && d >= monthStart;
  }).length;
  const visitasEsteAnio = (visits ?? []).filter((v) => {
    const d = dateOf(v);
    return d && d >= yearStart;
  }).length;

  // Agrupación año → mes para el historial completo (misma idea que Liquidaciones generales).
  const porAnioMes = new Map<number, Map<number, typeof visits>>();
  for (const v of visits ?? []) {
    const d = dateOf(v);
    if (!d) continue;
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!porAnioMes.has(y)) porAnioMes.set(y, new Map());
    const meses = porAnioMes.get(y)!;
    if (!meses.has(m)) meses.set(m, [] as any);
    (meses.get(m) as any).push(v);
  }
  const anios = [...porAnioMes.keys()].sort((a, b) => b - a);

  const { data: pendingIncidents } = await supabase
    .from("incidents")
    .select("id, description, repair_price")
    .eq("property_id", params.propertyId)
    .eq("type", "reparacion")
    .eq("covered_by_plan", false)
    .eq("client_consent_status", "pendiente");

  return (
    <div>
      <p className="muted" style={{ marginBottom: 4 }}>
        <Link href="/dashboard">← Sus viviendas</Link>
      </p>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>{property.address}</h1>

      {(pendingIncidents ?? []).map((inc) => (
        <IncidentConsent key={inc.id} incidentId={inc.id} description={inc.description} price={inc.repair_price != null ? Number(inc.repair_price) : null} />
      ))}

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, fontSize: 14 }}>
          <div><span className="muted">Esta semana:</span> <strong>{visitasEstaSemana}</strong></div>
          <div><span className="muted">Este mes:</span> <strong>{visitasEsteMes}</strong></div>
          <div><span className="muted">Este año:</span> <strong>{visitasEsteAnio}</strong></div>
        </div>
      </div>

      <h2 style={{ fontSize: 20, marginBottom: 16 }}>Historial de visitas</h2>

      {!visits?.length && <p className="muted">Todavía no hay visitas registradas.</p>}

      {anios.map((y) => {
        const meses = porAnioMes.get(y)!;
        const mesesOrdenados = [...meses.keys()].sort((a, b) => b - a);
        const totalAnio = mesesOrdenados.reduce((sum, m) => sum + (meses.get(m)?.length ?? 0), 0);
        return (
          <details key={y} style={{ marginBottom: 10 }}>
            <summary style={{ cursor: "pointer", fontSize: 16, padding: "8px 0" }}>
              {y} <span className="muted" style={{ fontSize: 13 }}>({totalAnio} visitas)</span>
            </summary>
            <div style={{ paddingLeft: 16 }}>
              {mesesOrdenados.map((m) => {
                const visitasMes = meses.get(m) ?? [];
                return (
                  <details key={m} style={{ marginBottom: 8 }}>
                    <summary style={{ cursor: "pointer", fontSize: 14, padding: "6px 0" }}>
                      {MONTH_LABEL[m]} <span className="muted">({visitasMes.length})</span>
                    </summary>
                    <div className="visit-list" style={{ paddingLeft: 16 }}>
                      {visitasMes.map((v: any) => (
                        <Link key={v.id} href={`/dashboard/${params.propertyId}/visits/${v.id}`} className="visit-row">
                          <span>{v.service_number ? `${v.service_number} — ` : ""}{v.completed_date ?? v.scheduled_date ?? "Sin fecha"}</span>
                          <span className="muted">{STATUS_LABEL[v.status] ?? v.status}</span>
                        </Link>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
