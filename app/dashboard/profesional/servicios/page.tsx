import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const fecha = (d: string | null) =>
  d ? new Date(d + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) : "Sin fecha todavía";

export default async function ServiciosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Nota: a este rol nunca se le selecciona amount_total de quotes ni ningún
  // dato de facturación del cliente — solo lo que a él se le paga.
  const [{ data: visits }, { data: quotes }, { data: requests }, { data: payments }] = await Promise.all([
    supabase
      .from("visits")
      .select("id, scheduled_date, status, service_number, arrived_at, properties(address)")
      .eq("professional_id", user.id)
      .order("scheduled_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("quotes")
      .select("id, title, status, service_number, properties(address)")
      .eq("assigned_professional_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quote_requests")
      .select("id, gremio, description, status, created_at, properties(address)")
      .eq("assigned_professional_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("professional_payments").select("id, amount, status, visit_id, quote_id").eq("professional_id", user.id),
  ]);

  const pendientes = (visits ?? []).filter((v) => v.status === "programada");
  const hechas = (visits ?? []).filter((v) => v.status !== "programada").reverse();
  const payoutFor = (key: "visit_id" | "quote_id", id: string) => payments?.find((p) => p[key] === id);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 className="pro-title">Mi servicio</h1>
        <p className="muted" style={{ fontSize: 16, marginBottom: 16 }}>Toque un servicio para abrirlo.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {pendientes.map((v: any) => (
            <Link key={v.id} href={`/dashboard/profesional/servicios/${v.id}`} className="pro-btn" style={{ minHeight: 96 }}>
              <span>
                {v.properties?.address}
                <small>
                  {fecha(v.scheduled_date)}
                  {v.arrived_at ? " — en curso" : ""}
                  {v.service_number ? ` — ${v.service_number}` : ""}
                </small>
              </span>
              <span>→</span>
            </Link>
          ))}
          {!pendientes.length && <p className="muted" style={{ fontSize: 18 }}>No tiene servicios pendientes.</p>}
        </div>
      </div>

      {!!hechas.length && (
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Realizados</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hechas.map((v: any) => {
              const payout = payoutFor("visit_id", v.id);
              return (
                <div key={v.id} className="visit-row" style={{ flexWrap: "wrap", gap: 6 }}>
                  <span>{v.properties?.address}</span>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {v.scheduled_date ? new Date(v.scheduled_date + "T00:00:00").toLocaleDateString("es-ES") : ""}
                    {payout && ` — ${money(Number(payout.amount))} (${payout.status})`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!!quotes?.length && (
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Presupuestos asignados</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {quotes.map((q: any) => {
              const payout = payoutFor("quote_id", q.id);
              return (
                <div key={q.id} className="visit-row" style={{ flexWrap: "wrap", gap: 6 }}>
                  <span>{q.service_number ? `${q.service_number} — ` : ""}{q.properties?.address} — {q.title}</span>
                  <span className="muted" style={{ fontSize: 14 }}>
                    {q.status}
                    {payout && ` — ${money(Number(payout.amount))} (${payout.status})`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!!requests?.length && (
        <div>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>Solicitudes asignadas</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {requests.map((r: any) => (
              <div key={r.id} className="card">
                <strong>{r.properties?.address ?? "Sin vivienda especificada"}</strong>
                <div className="muted" style={{ fontSize: 14, marginBottom: 8 }}>{r.gremio} — {r.status}</div>
                <p style={{ fontSize: 16 }}>{r.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
