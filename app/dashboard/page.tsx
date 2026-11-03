import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NpsPrompt from "./nps-prompt";

const PLAN_LABEL: Record<string, string> = {
  essential: "Essential",
  comfort: "Comfort",
  premium: "Premium",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  if (profile?.role === "manager") redirect("/dashboard/manager");
  if (profile?.role === "profesional") redirect("/dashboard/profesional");

  // RLS se encarga de que esto solo devuelva las viviendas del usuario
  // conectado — no hace falta (ni se debe) filtrar por client_id aquí.
  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, property_type, plan, payment_setup_completed")
    .order("created_at", { ascending: true });

  const pendingSetup = properties?.filter((p) => !p.payment_setup_completed) ?? [];
  const propertyIds = (properties ?? []).map((p) => p.id);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const { count: npsThisMonth } = await supabase
    .from("nps_responses")
    .select("id", { count: "exact", head: true })
    .gte("created_at", monthStart);
  const showNps = (npsThisMonth ?? 0) === 0 && (properties?.length ?? 0) > 0;

  const { data: liveVisits } = propertyIds.length
    ? await supabase
        .from("visits")
        .select("id, property_id, scheduled_date, arrived_at, departed_at")
        .in("property_id", propertyIds)
        .order("scheduled_date", { ascending: true })
    : { data: [] };

  const propertyAddress = (id: string) => properties?.find((p) => p.id === id)?.address ?? "";
  const liveVisit = (liveVisits ?? []).find((v) => v.arrived_at && !v.departed_at);
  const recentlyLeft = (liveVisits ?? []).find(
    (v) => v.departed_at && Date.now() - new Date(v.departed_at).getTime() < 3 * 60 * 60 * 1000
  );
  const nextVisitByProperty = new Map<string, string>();
  for (const v of liveVisits ?? []) {
    if (v.scheduled_date && !nextVisitByProperty.has(v.property_id) && new Date(v.scheduled_date) >= new Date(new Date().toDateString())) {
      nextVisitByProperty.set(v.property_id, v.scheduled_date);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 36, marginBottom: 24 }}>Sus viviendas</h1>

      {liveVisit && (
        <div className="alert-banner live">
          <span style={{ fontSize: 20 }}>🏠</span>
          <span>
            El profesional está ahora en <strong>{propertyAddress(liveVisit.property_id)}</strong> (llegó a las{" "}
            {new Date(liveVisit.arrived_at!).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}).
          </span>
        </div>
      )}
      {!liveVisit && recentlyLeft && (
        <div className="alert-banner live">
          <span style={{ fontSize: 20 }}>✅</span>
          <span>
            El profesional terminó y dejó <strong>{propertyAddress(recentlyLeft.property_id)}</strong> a las{" "}
            {new Date(recentlyLeft.departed_at!).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}.
          </span>
        </div>
      )}

      {showNps && <NpsPrompt propertyId={properties![0].id} />}

      {pendingSetup.length > 0 && (
        <div className="card" style={{ marginBottom: 24, borderColor: "var(--gold)" }}>
          <strong>Falta completar el alta de pago</strong>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {pendingSetup.map((p) => (
              <Link key={p.id} href={`/dashboard/alta/${p.id}`} className="muted" style={{ fontSize: 14 }}>
                {p.address} — añadir método de pago →
              </Link>
            ))}
          </div>
        </div>
      )}

      {!properties?.length && (
        <p className="muted">Todavía no hay ninguna vivienda asociada a su cuenta.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {properties?.map((p) => {
          const next = nextVisitByProperty.get(p.id);
          return (
            <Link key={p.id} href={`/dashboard/${p.id}`} className="visit-row" style={{ alignItems: "flex-start" }}>
              <div>
                <strong>{p.address}</strong>
                <div className="muted" style={{ fontSize: 14 }}>
                  Plan {PLAN_LABEL[p.plan] ?? p.plan}
                  {next && ` — próxima visita: ${new Date(next).toLocaleDateString("es-ES")}`}
                </div>
              </div>
              <span className="muted">→</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
