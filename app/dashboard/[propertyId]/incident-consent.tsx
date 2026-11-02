"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default function IncidentConsent({ incidentId, description, price }: { incidentId: string; description: string; price: number | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function respond(decision: "aceptado" | "rechazado") {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("respond_to_incident", { p_incident_id: incidentId, p_decision: decision });
    setBusy(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  return (
    <div className="card" style={{ borderColor: "var(--gold)", marginBottom: 16 }}>
      <strong>Reparación pendiente de su autorización</strong>
      <p style={{ fontSize: 14, margin: "10px 0" }}>{description}</p>
      <p style={{ fontSize: 14, marginBottom: 14 }}>
        Esta reparación no está incluida en su plan. Importe: <strong>{price != null ? money(price) : "a confirmar"}</strong>. Al aceptar,
        autoriza a Portofino a realizarla y a cobrarle este importe.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn" onClick={() => respond("aceptado")} disabled={busy}>
          {busy ? "…" : "Autorizar y aceptar el cobro"}
        </button>
        <button
          onClick={() => respond("rechazado")}
          disabled={busy}
          style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "13px 22px", cursor: "pointer", fontFamily: "inherit" }}
        >
          No autorizar
        </button>
      </div>
      {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}
    </div>
  );
}
