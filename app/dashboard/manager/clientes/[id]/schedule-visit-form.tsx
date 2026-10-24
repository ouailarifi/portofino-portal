"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ScheduleVisitForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/manager/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, scheduledDate: date }),
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
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)" }} required />
      <button className="btn" disabled={busy} style={{ padding: "8px 14px", fontSize: 13 }}>
        {busy ? "Programando…" : "Programar visita"}
      </button>
      {error && <span className="error" style={{ fontSize: 12 }}>{error}</span>}
    </form>
  );
}
