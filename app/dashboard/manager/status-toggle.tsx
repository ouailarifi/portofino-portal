"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const LABEL: Record<string, string> = { activo: "Activo", pausado: "Pausado", inactivo: "Baja" };
const COLOR: Record<string, string> = { activo: "var(--gold)", pausado: "#b8860b", inactivo: "var(--line)" };

export default function StatusToggle({
  id,
  status,
  kind,
}: {
  id: string;
  status: string;
  kind: "clients" | "professionals";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: string) {
    if (next === status) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/manager/${kind}/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(body.error ?? "No se pudo cambiar el estado");
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span
        style={{
          fontSize: 12,
          padding: "3px 10px",
          borderRadius: 999,
          border: `1px solid ${COLOR[status] ?? "var(--line)"}`,
          color: COLOR[status] ?? undefined,
        }}
      >
        {LABEL[status] ?? status}
      </span>
      <div style={{ display: "flex", gap: 6 }}>
        {(["activo", "pausado", "inactivo"] as const)
          .filter((s) => s !== status)
          .map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              disabled={busy}
              className="muted"
              style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
            >
              {s === "activo" ? "Reactivar" : s === "pausado" ? "Pausar" : "Dar de baja"}
            </button>
          ))}
      </div>
      {error && <span className="error" style={{ fontSize: 12 }}>{error}</span>}
    </div>
  );
}
