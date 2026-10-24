import { createClient } from "@/lib/supabase/server";
import PlanUpgradeForm from "./plan-upgrade-form";

const PLAN_LABEL: Record<string, string> = {
  essential: "Essential",
  comfort: "Comfort",
  premium: "Premium",
};

export default async function PlanPage() {
  const supabase = createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, plan, billing_mode")
    .order("created_at", { ascending: true });

  const { data: pendingRequests } = await supabase
    .from("plan_upgrade_requests")
    .select("property_id")
    .eq("status", "pendiente");

  const pendingByProperty = new Set((pendingRequests ?? []).map((r) => r.property_id));

  return (
    <div>
      <h1 style={{ fontSize: 32, marginBottom: 24 }}>Mi plan</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {properties?.map((p) => (
          <div key={p.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
              <div>
                <strong>{p.address}</strong>
                <div className="muted" style={{ fontSize: 14 }}>
                  Facturación {p.billing_mode === "annual" ? "anual" : "flexible"}
                </div>
              </div>
              <span
                style={{
                  background: "var(--gold-bg)",
                  color: "var(--gold)",
                  padding: "6px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  alignSelf: "flex-start",
                }}
              >
                Plan {PLAN_LABEL[p.plan] ?? p.plan}
              </span>
            </div>
            <PlanUpgradeForm propertyId={p.id} currentPlan={p.plan} pending={pendingByProperty.has(p.id)} />
          </div>
        ))}

        {!properties?.length && <p className="muted">Todavía no hay ninguna vivienda asociada a su cuenta.</p>}
      </div>
    </div>
  );
}
