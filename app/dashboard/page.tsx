import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const PLAN_LABEL: Record<string, string> = {
  essential: "Essential",
  comfort: "Comfort",
  premium: "Premium",
};

export default async function DashboardPage() {
  const supabase = createClient();

  // RLS se encarga de que esto solo devuelva las viviendas del usuario
  // conectado — no hace falta (ni se debe) filtrar por client_id aquí.
  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, property_type, plan")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 style={{ fontSize: 36, marginBottom: 24 }}>Sus viviendas</h1>

      {!properties?.length && (
        <p className="muted">Todavía no hay ninguna vivienda asociada a su cuenta.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {properties?.map((p) => (
          <Link key={p.id} href={`/dashboard/${p.id}`} className="visit-row">
            <div>
              <strong>{p.address}</strong>
              <div className="muted" style={{ fontSize: 14 }}>
                Plan {PLAN_LABEL[p.plan] ?? p.plan}
              </div>
            </div>
            <span className="muted">Ver visitas →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
