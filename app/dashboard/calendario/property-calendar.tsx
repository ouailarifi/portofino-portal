"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { nextWeeks, weekLabel, toISODate } from "@/lib/calendar";

type Entry = { property_id: string; entry_type: "ocupacion" | "visita_preferida"; week_start: string };

export default function PropertyCalendar({ propertyId, entries }: { propertyId: string; entries: Entry[] }) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const weeks = useMemo(() => nextWeeks(8), []);

  function has(weekIso: string, type: Entry["entry_type"]) {
    return entries.some((e) => e.week_start === weekIso && e.entry_type === type);
  }

  async function toggle(weekIso: string, type: Entry["entry_type"]) {
    const key = `${weekIso}-${type}`;
    setBusyKey(key);
    const active = has(weekIso, type);
    await fetch("/api/calendar", {
      method: active ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, entryType: type, weekStart: weekIso }),
    });
    setBusyKey(null);
    router.refresh();
  }

  return (
    <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>
        <span>Semana</span>
        <span>Voy a estar</span>
        <span>Prefiero visita</span>
      </div>
      {weeks.map((w) => {
        const iso = toISODate(w);
        const occ = has(iso, "ocupacion");
        const pref = has(iso, "visita_preferida");
        return (
          <div key={iso} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", fontSize: 14, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            <span>{weekLabel(w)}</span>
            <button
              onClick={() => toggle(iso, "ocupacion")}
              disabled={busyKey === `${iso}-ocupacion`}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: occ ? "var(--gold)" : "none",
                color: occ ? "#fff" : "inherit",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
              }}
            >
              {occ ? "Sí" : "No"}
            </button>
            <button
              onClick={() => toggle(iso, "visita_preferida")}
              disabled={busyKey === `${iso}-visita_preferida`}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: pref ? "var(--gold)" : "none",
                color: pref ? "#fff" : "inherit",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 13,
              }}
            >
              {pref ? "Sí" : "No"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
