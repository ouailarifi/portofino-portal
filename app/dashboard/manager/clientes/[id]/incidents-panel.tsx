"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Incident = {
  id: string;
  type: "reparacion" | "acceso";
  description: string;
  covered_by_plan: boolean | null;
  repair_price: number | null;
  client_consent_status: string;
  access_reason: string | null;
  status: string;
  created_at: string;
};

const ACCESS_REASON_LABEL: Record<string, string> = {
  invitados_en_vivienda: "Hay invitados en la vivienda",
  propietario_rechaza: "El propietario rechaza la visita",
  otro: "Otro motivo",
};

const CONSENT_LABEL: Record<string, string> = {
  no_aplica: "No aplica",
  pendiente: "Pendiente de respuesta del cliente",
  aceptado: "Aceptado por el cliente",
  rechazado: "Rechazado por el cliente",
};

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default function IncidentsPanel({ propertyId, incidents }: { propertyId: string; incidents: Incident[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"reparacion" | "acceso">("reparacion");
  const [description, setDescription] = useState("");
  const [coveredByPlan, setCoveredByPlan] = useState("si");
  const [repairPrice, setRepairPrice] = useState("");
  const [accessReason, setAccessReason] = useState("invitados_en_vivienda");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const covered = type === "reparacion" ? coveredByPlan === "si" : null;
    const { error } = await supabase.from("incidents").insert({
      property_id: propertyId,
      type,
      description,
      covered_by_plan: covered,
      repair_price: type === "reparacion" && !covered ? Number(repairPrice) || null : null,
      client_consent_status: type === "reparacion" && covered === false ? "pendiente" : "no_aplica",
      access_reason: type === "acceso" ? accessReason : null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDescription("");
    setRepairPrice("");
    setOpen(false);
    router.refresh();
  }

  async function markResolved(id: string) {
    await supabase.from("incidents").update({ status: "resuelta", resolved_at: new Date().toISOString() }).eq("id", id);
    router.refresh();
  }

  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginBottom: 14 }}>
      <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Incidencias</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {incidents.map((inc) => (
          <div key={inc.id} className="visit-row" style={{ flexDirection: "column", alignItems: "stretch", fontSize: 13, gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <span>
                <strong>{inc.type === "reparacion" ? "Reparación" : "Acceso"}</strong> — {inc.description}
              </span>
              <span className="muted">{new Date(inc.created_at).toLocaleDateString("es-ES")} — {inc.status}</span>
            </div>
            {inc.type === "reparacion" && (
              <span className="muted">
                {inc.covered_by_plan ? "Cubierta por el plan — se repara sin coste." : `No cubierta — ${inc.repair_price != null ? money(inc.repair_price) : "sin importe"} — ${CONSENT_LABEL[inc.client_consent_status]}`}
              </span>
            )}
            {inc.type === "acceso" && <span className="muted">{ACCESS_REASON_LABEL[inc.access_reason ?? ""] ?? inc.access_reason}</span>}
            {inc.status === "abierta" && (
              <button
                onClick={() => markResolved(inc.id)}
                className="muted"
                style={{ alignSelf: "flex-start", background: "none", border: "none", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}
              >
                Marcar como resuelta
              </button>
            )}
          </div>
        ))}
        {!incidents.length && <p className="muted" style={{ fontSize: 13 }}>Sin incidencias registradas.</p>}
      </div>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="muted"
          style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
        >
          + Registrar incidencia
        </button>
      ) : (
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 420 }}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as "reparacion" | "acceso")}
            style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13, fontFamily: "inherit" }}
          >
            <option value="reparacion">Reparación detectada en visita</option>
            <option value="acceso">No se pudo acceder a la vivienda</option>
          </select>
          <textarea
            required
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción"
            style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13, fontFamily: "inherit" }}
          />
          {type === "reparacion" ? (
            <>
              <select
                value={coveredByPlan}
                onChange={(e) => setCoveredByPlan(e.target.value)}
                style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13, fontFamily: "inherit" }}
              >
                <option value="si">Cubierta por el plan — se repara sin coste</option>
                <option value="no">No cubierta — requiere consentimiento y cobro al cliente</option>
              </select>
              {coveredByPlan === "no" && (
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={repairPrice}
                  onChange={(e) => setRepairPrice(e.target.value)}
                  placeholder="Precio de la reparación (€)"
                  style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13, fontFamily: "inherit" }}
                />
              )}
            </>
          ) : (
            <select
              value={accessReason}
              onChange={(e) => setAccessReason(e.target.value)}
              style={{ padding: "7px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13, fontFamily: "inherit" }}
            >
              <option value="invitados_en_vivienda">Hay invitados en la vivienda</option>
              <option value="propietario_rechaza">El propietario rechaza la visita</option>
              <option value="otro">Otro motivo</option>
            </select>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" disabled={busy} style={{ padding: "7px 14px", fontSize: 12 }}>{busy ? "…" : "Registrar"}</button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={busy}
              style={{ background: "none", border: "1px solid var(--line)", borderRadius: 6, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontFamily: "inherit" }}
            >
              Cancelar
            </button>
          </div>
          {error && <span className="error" style={{ fontSize: 12 }}>{error}</span>}
        </form>
      )}
    </div>
  );
}
