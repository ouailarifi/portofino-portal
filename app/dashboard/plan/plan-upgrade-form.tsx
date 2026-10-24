"use client";

import { useState } from "react";

const PLAN_LABEL: Record<string, string> = {
  essential: "Essential",
  comfort: "Comfort",
  premium: "Premium",
};
const PLAN_ORDER = ["essential", "comfort", "premium"];

export default function PlanUpgradeForm({
  propertyId,
  currentPlan,
  pending,
}: {
  propertyId: string;
  currentPlan: string;
  pending: boolean;
}) {
  const higherPlans = PLAN_ORDER.slice(PLAN_ORDER.indexOf(currentPlan) + 1);
  const [selected, setSelected] = useState(higherPlans[0] ?? "");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  if (!higherPlans.length) {
    return <p className="muted" style={{ fontSize: 14 }}>Ya tiene el plan más alto disponible.</p>;
  }

  if (pending) {
    return (
      <p className="muted" style={{ fontSize: 14 }}>
        Ya tiene una petición de cambio de plan pendiente de revisión.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const res = await fetch("/api/plan-upgrade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, requestedPlan: selected }),
    });
    setStatus(res.ok ? "sent" : "error");
  }

  if (status === "sent") {
    return <p style={{ fontSize: 14, color: "var(--gold)" }}>Petición enviada. Le avisaremos cuando se revise.</p>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 8, fontFamily: "inherit" }}
      >
        {higherPlans.map((p) => (
          <option key={p} value={p}>
            Subir a {PLAN_LABEL[p]}
          </option>
        ))}
      </select>
      <button className="btn" disabled={status === "sending"}>
        {status === "sending" ? "Enviando…" : "Solicitar cambio"}
      </button>
      {status === "error" && <span className="error">No se pudo enviar. Inténtelo de nuevo.</span>}
    </form>
  );
}
