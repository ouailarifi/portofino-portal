import { createClient } from "@/lib/supabase/server";
import QuoteActions from "./quote-actions";

const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente de respuesta",
  aceptado: "Aceptado",
  rechazado: "Rechazado",
};

const SIGNED_URL_TTL = 60 * 10;

const money = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default async function PresupuestosPage({
  searchParams,
}: {
  searchParams: { pago?: string };
}) {
  const supabase = createClient();

  const { data: properties } = await supabase.from("properties").select("id, address");
  const propertyIds = (properties ?? []).map((p) => p.id);

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, title, description, amount_total, storage_path, status, created_at, property_id")
    .in("property_id", propertyIds.length ? propertyIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  const addressByProperty = new Map((properties ?? []).map((p) => [p.id, p.address]));

  const quotesWithUrls = await Promise.all(
    (quotes ?? []).map(async (q) => {
      if (!q.storage_path) return { ...q, url: undefined };
      const { data } = await supabase.storage.from("visit-reports").createSignedUrl(q.storage_path, SIGNED_URL_TTL);
      return { ...q, url: data?.signedUrl };
    })
  );

  return (
    <div>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Presupuestos</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Propuestas de obra para sus viviendas. Puede verlas, descargarlas, y aceptarlas o rechazarlas.
      </p>

      {searchParams.pago === "ok" && (
        <p style={{ marginBottom: 20, color: "var(--gold)" }}>
          Pago recibido. El presupuesto quedará marcado como aceptado en unos segundos.
        </p>
      )}
      {searchParams.pago === "cancelado" && (
        <p className="muted" style={{ marginBottom: 20 }}>Pago cancelado. El presupuesto sigue pendiente.</p>
      )}

      {!quotesWithUrls.length && <p className="muted">Todavía no hay presupuestos para sus viviendas.</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {quotesWithUrls.map((q) => (
          <div key={q.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              <div>
                <strong>{q.title}</strong>
                <div className="muted" style={{ fontSize: 14 }}>{addressByProperty.get(q.property_id)}</div>
              </div>
              <span className="muted" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {STATUS_LABEL[q.status]}
              </span>
            </div>

            {q.description && <p style={{ fontSize: 14, marginBottom: 12 }}>{q.description}</p>}

            <p style={{ fontSize: 20, marginBottom: 12 }}>{money(q.amount_total)}</p>

            {q.url && (
              <a href={q.url} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: 14, textDecoration: "underline" }}>
                Descargar presupuesto en PDF
              </a>
            )}

            {q.status === "pendiente" && <QuoteActions quoteId={q.id} amountTotal={q.amount_total} />}
          </div>
        ))}
      </div>
    </div>
  );
}
