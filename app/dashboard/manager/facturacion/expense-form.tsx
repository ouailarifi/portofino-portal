"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExpenseForm({ monthDate }: { monthDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/manager/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: monthDate, concept, amount }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar el gasto");
      return;
    }
    setConcept("");
    setAmount("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="muted"
        style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
      >
        + Añadir gasto
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
      <input
        required
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        placeholder="Concepto (ej.: alquiler, software…)"
        style={{ flex: "1 1 200px", padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13, fontFamily: "inherit" }}
      />
      <input
        required
        type="number"
        step="0.01"
        min="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="€"
        style={{ width: 100, padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13, fontFamily: "inherit" }}
      />
      <button className="btn" disabled={busy} style={{ padding: "7px 14px", fontSize: 12 }}>{busy ? "…" : "Guardar"}</button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        disabled={busy}
        style={{ background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
      >
        Cancelar
      </button>
      {error && <span className="error" style={{ fontSize: 12 }}>{error}</span>}
    </form>
  );
}
