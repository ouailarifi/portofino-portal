import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default async function ProfesionalPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Nota: a este rol nunca se le selecciona amount_total de quotes ni ningún
  // dato de facturación del cliente — solo lo que a él se le paga
  // (professional_payments) y sus propias autofacturas (invoices).
  const [{ data: visits }, { data: quotes }, { data: requests }, { data: payments }, { data: invoices }] = await Promise.all([
    supabase
      .from("visits")
      .select("id, scheduled_date, status, service_number, properties(address)")
      .eq("professional_id", user.id)
      .order("scheduled_date", { ascending: true }),
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
    supabase
      .from("professional_payments")
      .select("id, concept, amount, status, paid_at, visit_id, quote_id")
      .eq("professional_id", user.id),
    supabase
      .from("invoices")
      .select("id, series, number, concept, total_amount, storage_path, created_at")
      .eq("professional_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const payoutForVisit = (visitId: string) => payments?.find((p) => p.visit_id === visitId);
  const payoutForQuote = (quoteId: string) => payments?.find((p) => p.quote_id === quoteId);

  const service = createServiceClient();
  const invoicesWithUrls = await Promise.all(
    (invoices ?? []).map(async (inv) => {
      const { data } = await service.storage.from("invoices").createSignedUrl(inv.storage_path, 3600);
      return { ...inv, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 30, marginBottom: 16 }}>Mis visitas asignadas</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visits?.map((v: any) => {
            const payout = payoutForVisit(v.id);
            return (
              <div key={v.id} className="visit-row">
                <span>{v.service_number ? `${v.service_number} — ` : ""}{v.properties?.address}</span>
                <span className="muted">
                  {v.scheduled_date ?? "sin fecha"} — {v.status}
                  {payout && ` — ${money(Number(payout.amount))} (${payout.status})`}
                </span>
              </div>
            );
          })}
          {!visits?.length && <p className="muted">No tiene visitas asignadas.</p>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Presupuestos asignados</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {quotes?.map((q: any) => {
            const payout = payoutForQuote(q.id);
            return (
              <div key={q.id} className="visit-row">
                <span>{q.service_number ? `${q.service_number} — ` : ""}{q.properties?.address} — {q.title}</span>
                <span className="muted">
                  {q.status}
                  {payout && ` — ${money(Number(payout.amount))} (${payout.status})`}
                </span>
              </div>
            );
          })}
          {!quotes?.length && <p className="muted">No tiene presupuestos asignados.</p>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Solicitudes asignadas</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests?.map((r: any) => (
            <div key={r.id} className="card">
              <strong>{r.properties?.address ?? "Sin vivienda especificada"}</strong>
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{r.gremio} — {r.status}</div>
              <p style={{ fontSize: 14 }}>{r.description}</p>
            </div>
          ))}
          {!requests?.length && <p className="muted">No tiene solicitudes asignadas.</p>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Mis autofacturas</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {invoicesWithUrls.map((inv) => (
            <div key={inv.id} className="visit-row">
              <span>{inv.series}-{inv.number} — {inv.concept}</span>
              <span className="muted" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {money(Number(inv.total_amount))}
                {inv.url && <a href={inv.url} target="_blank" rel="noreferrer">Ver</a>}
              </span>
            </div>
          ))}
          {!invoicesWithUrls.length && <p className="muted">Todavía no tiene autofacturas.</p>}
        </div>
      </div>
    </div>
  );
}
