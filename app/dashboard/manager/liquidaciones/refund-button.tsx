"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RefundButton({ paymentId, maxAmount }: { paymentId: string; maxAmount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(maxAmount));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/manager/refunds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId, amount }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo reembolsar");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", fontSize: 12 }}>
        Reembolsar
      </button>
    );
  }

  return (
    <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input
        type="number"
        min="0.01"
        step="0.01"
        max={maxAmount}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{ width: 80, padding: "4px 6px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 12 }}
      />
      <button onClick={handleConfirm} disabled={busy} style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
        {busy ? "…" : "Confirmar"}
      </button>
      {error && <span className="error" style={{ fontSize: 11 }}>{error}</span>}
    </span>
  );
}
