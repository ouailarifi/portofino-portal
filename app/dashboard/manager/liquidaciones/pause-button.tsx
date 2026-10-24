"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PauseButton({ propertyId, initialPaused }: { propertyId: string; initialPaused: boolean }) {
  const router = useRouter();
  const [paused, setPaused] = useState(initialPaused);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const next = !paused;
    const res = await fetch("/api/manager/subscriptions/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, pause: next }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo actualizar");
      return;
    }
    setPaused(next);
    router.refresh();
  }

  return (
    <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
      {error && <span className="error" style={{ fontSize: 11 }}>{error}</span>}
      <button
        onClick={handleClick}
        disabled={busy}
        style={{
          fontSize: 12,
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid var(--line)",
          background: paused ? "var(--gold)" : "none",
          color: paused ? "#1a1a1a" : "inherit",
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        {busy ? "…" : paused ? "Reanudar" : "Pausar"}
      </button>
    </span>
  );
}
