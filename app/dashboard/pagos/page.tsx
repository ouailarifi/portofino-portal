import { createClient } from "@/lib/supabase/server";

const money = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const STATUS_LABEL: Record<string, string> = {
  cobrado: "Cobrado",
  reembolsado: "Reembolsado",
  fallido: "Fallido",
};

export default async function PagosPage() {
  const supabase = createClient();

  const { data: payments } = await supabase
    .from("payments")
    .select("id, concept, amount, currency, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Cobros</h1>

      {!payments?.length && <p className="muted">Todavía no hay ningún cobro registrado en su cuenta.</p>}

      <div className="visit-list">
        {payments?.map((p) => (
          <div key={p.id} className="visit-row">
            <div>
              <strong>{p.concept}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {new Date(p.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
                {" · "}
                {STATUS_LABEL[p.status] ?? p.status}
              </div>
            </div>
            <strong>{money(p.amount)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
