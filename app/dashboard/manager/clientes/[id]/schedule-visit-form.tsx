"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nextWeeks, weekLabel, toISODate, mondayOf } from "@/lib/calendar";

type Professional = { id: string; full_name: string; codigo_profesional: string };

export default function ScheduleVisitForm({
  propertyId,
  professionals,
  occupiedWeeks,
  preferredWeeks,
}: {
  propertyId: string;
  professionals: Professional[];
  occupiedWeeks: string[];
  preferredWeeks: string[];
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weeks = useMemo(() => nextWeeks(8), []);

  // Semana de la fecha elegida, para avisar en rojo/verde según el
  // calendario que el cliente marcó desde su perfil, antes de confirmar.
  const selectedWeekIso = date ? toISODate(mondayOf(new Date(date))) : null;
  const selectedIsOccupied = selectedWeekIso ? occupiedWeeks.includes(selectedWeekIso) : false;
  const selectedIsPreferred = selectedWeekIso ? preferredWeeks.includes(selectedWeekIso) : false;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/manager/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, scheduledDate: date, professionalId: professionalId || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo programar");
      return;
    }
    setDate("");
    router.refresh();
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 10, fontSize: 12 }}>
        {weeks.map((w) => {
          const iso = toISODate(w);
          const occ = occupiedWeeks.includes(iso);
          const pref = preferredWeeks.includes(iso);
          const color = occ ? "#c0392b" : pref ? "var(--gold)" : "var(--muted)";
          const bg = occ ? "rgba(192,57,43,0.1)" : pref ? "var(--gold-bg)" : "transparent";
          return (
            <span
              key={iso}
              style={{ padding: "3px 8px", borderRadius: 6, border: `1px solid ${color}`, background: bg, color }}
              title={occ ? "El cliente estará en la vivienda" : pref ? "Semana preferida por el cliente" : "Sin marcar"}
            >
              {weekLabel(w)}
            </span>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}
        >
          <option value="">Sin profesional (asignar luego)</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>
              {p.codigo_profesional} — {p.full_name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: `1px solid ${selectedIsOccupied ? "#c0392b" : selectedIsPreferred ? "var(--gold)" : "var(--line)"}`,
          }}
          required
        />
        <button className="btn" disabled={busy} style={{ padding: "8px 14px", fontSize: 13 }}>
          {busy ? "Programando…" : "Programar visita"}
        </button>
        {error && <span className="error" style={{ fontSize: 12 }}>{error}</span>}
      </form>
      {date && selectedIsOccupied && (
        <p style={{ fontSize: 12, color: "#c0392b", marginTop: 6 }}>
          ⚠️ El cliente marcó que estará en la vivienda esa semana.
        </p>
      )}
      {date && selectedIsPreferred && (
        <p style={{ fontSize: 12, color: "var(--gold)", marginTop: 6 }}>
          ✅ El cliente prefiere la visita esa semana.
        </p>
      )}
    </div>
  );
}
