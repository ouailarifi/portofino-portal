import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlanEditorForm from "./plan-editor-form";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default async function PlanesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "manager") redirect("/dashboard");

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();

  const [{ data: plans }, { data: properties }, { data: invoices }] = await Promise.all([
    supabase.from("plans").select("*").order("display_order", { ascending: true }),
    supabase.from("properties").select("plan, subscription_status"),
    supabase.from("invoices").select("total_amount, property_id, properties(plan)").not("client_id", "is", null).gte("created_at", yearStart),
  ]);

  const contractsByPlan = new Map<string, number>();
  for (const p of properties ?? []) {
    if (p.subscription_status !== "activa") continue;
    contractsByPlan.set(p.plan, (contractsByPlan.get(p.plan) ?? 0) + 1);
  }

  const billingByPlan = new Map<string, number>();
  for (const inv of (invoices ?? []) as any[]) {
    const slug = inv.properties?.plan;
    if (!slug) continue;
    billingByPlan.set(slug, (billingByPlan.get(slug) ?? 0) + Number(inv.total_amount));
  }

  return (
    <div>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Planes</h1>
      <p className="muted" style={{ marginBottom: 28 }}>
        Catálogo de planes, precio y contenido. Los cambios aquí se reflejan en la web pública y en el panel de cliente.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
        {(plans ?? []).map((plan) => (
          <div key={plan.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div>
                <h2 style={{ fontSize: 24 }}>{plan.name}</h2>
                {plan.subtitle && <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{plan.subtitle}</p>}
              </div>
              {!plan.active && (
                <span className="muted" style={{ fontSize: 11, border: "1px solid var(--line)", borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>
                  Inactivo
                </span>
              )}
            </div>

            <div style={{ fontSize: 30, fontFamily: '"Cormorant Garamond", Georgia, serif', margin: "12px 0" }}>
              {money(Number(plan.price))}<span className="muted" style={{ fontSize: 14 }}> /mes</span>
            </div>

            <ul style={{ fontSize: 13, color: "var(--muted)", paddingLeft: 18, margin: "0 0 16px", display: "flex", flexDirection: "column", gap: 4 }}>
              {(plan.items as string[]).slice(0, 4).map((it, i) => (
                <li key={i}>{it}</li>
              ))}
              {(plan.items as string[]).length > 4 && <li>… y {(plan.items as string[]).length - 4} más</li>}
            </ul>

            <div style={{ display: "flex", gap: 20, borderTop: "1px solid var(--line)", paddingTop: 14, marginBottom: 4 }}>
              <div>
                <div className="muted" style={{ fontSize: 11, textTransform: "uppercase" }}>Contratos activos</div>
                <div style={{ fontSize: 18 }}>{contractsByPlan.get(plan.slug) ?? 0}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 11, textTransform: "uppercase" }}>Facturado este año</div>
                <div style={{ fontSize: 18 }}>{money(billingByPlan.get(plan.slug) ?? 0)}</div>
              </div>
            </div>

            <PlanEditorForm plan={{ ...plan, items: plan.items as string[] }} />
          </div>
        ))}
      </div>
    </div>
  );
}
