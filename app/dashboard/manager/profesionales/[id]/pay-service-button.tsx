"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PayServiceButton({ professionalId, visitId, quoteId, defaultConcept }: { professionalId: string; visitId?: string; quoteId?: string; defaultConcept: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [concept, setConcept] = useState(defaultConcept);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!amount || Number(amount) <= 0) {
      setError("Introduce un importe");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/manager/professional-payments/pay-now", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professionalId, concept, amount, visitId, quoteId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar el pago");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--gold)", cursor: "pointer", fontFamily: "inherit" }}>
        Pagar
      </button>
    );
  }

  return (
    <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input
        value={concept}
        onChange={(e) => setConcept(e.target.value)}
        placeholder="Motivo del pago"
        style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", fontFamily: "inherit", width: 160 }}
      />
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Importe (€)"
        style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", fontFamily: "inherit", width: 90 }}
      />
      <button onClick={handleConfirm} disabled={busy} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--gold)", cursor: "pointer", fontFamily: "inherit" }}>
        {busy ? "…" : "Confirmar"}
      </button>
      <button onClick={() => setOpen(false)} style={{ fontSize: 12, border: "none", background: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>
        Cancelar
      </button>
      {error && <span className="error" style={{ fontSize: 11, width: "100%" }}>{error}</span>}
    </span>
  );
}
