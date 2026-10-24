import { createClient } from "@/lib/supabase/server";
import PaymentMethods from "./payment-methods";
import CancelProperty from "./cancel-property";

const STATUS_LABEL: Record<string, string> = {
  activa: "Activa",
  baja_solicitada: "Baja solicitada",
  dada_de_baja: "Dada de baja",
};

export default async function ConfiguracionPage() {
  const supabase = createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, subscription_status")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Configuración</h1>

      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Métodos de pago</h2>
        <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>
          Verificados directamente por Stripe. No puede eliminar su único método de pago — añada otro primero.
        </p>
        <PaymentMethods />
      </section>

      <section>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Baja de Portofino</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {properties?.map((p) => (
            <div key={p.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <strong>{p.address}</strong>
                <span className="muted" style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {STATUS_LABEL[p.subscription_status]}
                </span>
              </div>
              {p.subscription_status === "activa" ? (
                <CancelProperty propertyId={p.id} address={p.address} />
              ) : (
                <p className="muted" style={{ fontSize: 14 }}>
                  Ya hay una baja {p.subscription_status === "baja_solicitada" ? "en curso" : "confirmada"} para esta
                  vivienda.
                </p>
              )}
            </div>
          ))}
          {!properties?.length && <p className="muted">No hay viviendas asociadas a su cuenta.</p>}
        </div>
      </section>
    </div>
  );
}
