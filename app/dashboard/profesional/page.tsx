import { createClient } from "@/lib/supabase/server";

const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };

export default async function ProfesionalPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: visits }, { data: quotes }, { data: requests }] = await Promise.all([
    supabase
      .from("visits")
      .select("id, scheduled_date, status, properties(address)")
      .eq("professional_id", user.id)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("quotes")
      .select("id, title, status, amount_total, properties(address)")
      .eq("assigned_professional_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("quote_requests")
      .select("id, gremio, description, status, created_at, properties(address)")
      .eq("assigned_professional_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <h1 style={{ fontSize: 30, marginBottom: 16 }}>Mis visitas asignadas</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visits?.map((v: any) => (
            <div key={v.id} className="visit-row">
              <span>{v.properties?.address}</span>
              <span className="muted">{v.scheduled_date ?? "sin fecha"} — {v.status}</span>
            </div>
          ))}
          {!visits?.length && <p className="muted">No tiene visitas asignadas.</p>}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Presupuestos asignados</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {quotes?.map((q: any) => (
            <div key={q.id} className="visit-row">
              <span>{q.properties?.address} — {q.title}</span>
              <span className="muted">{q.status}</span>
            </div>
          ))}
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
    </div>
  );
}
