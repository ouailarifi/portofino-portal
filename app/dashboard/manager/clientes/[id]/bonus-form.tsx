"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BonusForm({ clientId, initialNote, initialAmount }: { clientId: string; initialNote: string | null; initialAmount: number | null }) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [amount, setAmount] = useState(initialAmount != null ? String(initialAmount) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/manager/clients/${clientId}/bonus`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bonusNote: note, bonusAmount: amount }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
      <div style={{ flex: "2 1 220px" }}>
        <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Bonificación (texto libre)</label>
        <input
          value={note}
          onChange={(e) => { setNote(e.target.value); setSaved(false); }}
          placeholder="Ej.: 1 mes gratis por incidencia"
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
        />
      </div>
      <div style={{ flex: "1 1 120px" }}>
        <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Importe (€, opcional)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setSaved(false); }}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
        />
      </div>
      <button className="btn" disabled={busy} style={{ padding: "8px 16px" }}>{busy ? "…" : "Guardar"}</button>
      {error && <span className="error" style={{ fontSize: 12 }}>{error}</span>}
      {saved && <span style={{ color: "var(--gold)", fontSize: 12 }}>Guardado.</span>}
    </form>
  );
}
