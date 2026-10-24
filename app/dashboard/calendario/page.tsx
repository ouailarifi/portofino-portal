import { createClient } from "@/lib/supabase/server";
import { toISODate } from "@/lib/calendar";
import PropertyCalendar from "./property-calendar";

export default async function CalendarioPage() {
  const supabase = createClient();
  const { data: properties } = await supabase.from("properties").select("id, address").order("created_at", { ascending: true });

  const { data: entries } = await supabase
    .from("property_calendar_entries")
    .select("property_id, entry_type, week_start")
    .gte("week_start", toISODate(new Date()));

  return (
    <div style={{ maxWidth: 720 }}>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>Calendario</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Marque las semanas en las que estará en la vivienda y en qué semana prefiere que pasemos a hacer la visita.
        Necesitamos al menos una semana de antelación para organizarnos.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {(properties ?? []).map((p) => (
          <div key={p.id} className="card">
            <strong>{p.address}</strong>
            <PropertyCalendar
              propertyId={p.id}
              entries={(entries ?? []).filter((e) => e.property_id === p.id)}
            />
          </div>
        ))}
        {!properties?.length && <p className="muted">Todavía no hay ninguna vivienda asociada a su cuenta.</p>}
      </div>
    </div>
  );
}
