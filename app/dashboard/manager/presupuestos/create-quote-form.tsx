"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateQuoteForm({
  quoteRequestId,
  propertyId,
  defaultTitle,
}: {
  quoteRequestId: string;
  propertyId: string | null;
  defaultTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/manager/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteRequestId, propertyId, title, description, amountTotal: amount }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar el presupuesto");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!propertyId) {
    return <p className="muted" style={{ fontSize: 12 }}>Falta la vivienda en esta solicitud — revísala antes de presupuestar.</p>;
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)} style={{ padding: "8px 16px" }}>
        Dar presupuesto
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 440, marginTop: 10 }}>
      <input
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del presupuesto"
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        placeholder="Detalle de lo que incluye el presupuesto"
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
      />
      <input
        required
        type="number"
        step="0.01"
        min="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Importe total (€)"
        style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
      />
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn" disabled={busy} style={{ padding: "8px 16px" }}>{busy ? "Enviando…" : "Enviar al cliente"}</button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontFamily: "inherit" }}
        >
          Cancelar
        </button>
      </div>
      {error && <span className="error" style={{ fontSize: 12 }}>{error}</span>}
    </form>
  );
}
