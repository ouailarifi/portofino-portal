"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteQuoteButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("¿Eliminar este presupuesto? Esta acción no se puede deshacer.")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quotes/${quoteId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo eliminar");
      return;
    }
    router.refresh();
  }

  return (
    <span>
      <button
        onClick={handleDelete}
        disabled={busy}
        className="muted"
        style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontSize: 13, padding: 0 }}
      >
        {busy ? "Eliminando…" : "Eliminar presupuesto"}
      </button>
      {error && <p className="error" style={{ fontSize: 12, marginTop: 4 }}>{error}</p>}
    </span>
  );
}
