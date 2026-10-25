"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ResolvePlanRequestButtons({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolve(action: "aplicar" | "descartar") {
    setBusy(action);
    setError(null);
    const res = await fetch(`/api/manager/plan-upgrade-requests/${requestId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "No se pudo resolver");
      return;
    }
    router.refresh();
  }

  return (
    <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button onClick={() => resolve("aplicar")} disabled={!!busy} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--gold)", cursor: "pointer", fontFamily: "inherit" }}>
        {busy === "aplicar" ? "…" : "Aplicar cambio"}
      </button>
      <button onClick={() => resolve("descartar")} disabled={!!busy} style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
        {busy === "descartar" ? "…" : "Descartar"}
      </button>
      {error && <span className="error" style={{ fontSize: 11 }}>{error}</span>}
    </span>
  );
}
