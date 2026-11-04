"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IncidentForm({ visitId }: { visitId: string }) {
  const router = useRouter();
  const [type, setType] = useState<"reparacion" | "acceso">("reparacion");
  const [description, setDescription] = useState("");
  const [accessReason, setAccessReason] = useState("invitados_en_vivienda");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/profesional/servicio/${visitId}/incidencia`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, description, accessReason }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar. Inténtelo de nuevo.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 20, color: "var(--gold)" }}>Incidencia enviada. Portofino ya la tiene.</p>
        <button className="pro-btn primary" onClick={() => router.push(`/dashboard/profesional/servicios/${visitId}`)}>
          Volver al servicio
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={send} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button type="button" className={type === "reparacion" ? "pro-btn primary" : "pro-btn"} onClick={() => setType("reparacion")} style={{ minHeight: 70, fontSize: 20 }}>
          Hay algo que reparar
        </button>
        <button type="button" className={type === "acceso" ? "pro-btn primary" : "pro-btn"} onClick={() => setType("acceso")} style={{ minHeight: 70, fontSize: 20 }}>
          No he podido entrar
        </button>
      </div>

      {type === "acceso" && (
        <div className="pro-field">
          <label htmlFor="motivo-acceso">¿Por qué no ha podido entrar?</label>
          <select id="motivo-acceso" value={accessReason} onChange={(e) => setAccessReason(e.target.value)}>
            <option value="invitados_en_vivienda">Hay invitados en la vivienda</option>
            <option value="propietario_rechaza">El propietario rechaza la visita</option>
            <option value="otro">Otro motivo</option>
          </select>
        </div>
      )}

      <div className="pro-field">
        <label htmlFor="descripcion">Cuéntenos qué ha pasado</label>
        <textarea id="descripcion" rows={5} required value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      {error && <p className="error" style={{ fontSize: 16 }}>{error}</p>}

      <button className="pro-btn primary" disabled={busy || !description.trim()}>
        {busy ? "Enviando…" : "Enviar incidencia"}
      </button>
    </form>
  );
}
