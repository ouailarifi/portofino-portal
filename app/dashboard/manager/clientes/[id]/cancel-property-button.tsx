"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelPropertyButton({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/manager/properties/${propertyId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo dar de baja");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
        Cancelar (dar de baja)
      </button>
    );
  }

  return (
    <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (opcional)"
        style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--line)", fontFamily: "inherit" }}
      />
      <button onClick={handleConfirm} disabled={busy} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--gold)", cursor: "pointer", fontFamily: "inherit" }}>
        {busy ? "…" : "Confirmar baja"}
      </button>
      <button onClick={() => setOpen(false)} style={{ fontSize: 12, padding: "4px 8px", border: "none", background: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>
        Cancelar
      </button>
      {error && <span className="error" style={{ fontSize: 11, width: "100%" }}>{error}</span>}
    </span>
  );
}
