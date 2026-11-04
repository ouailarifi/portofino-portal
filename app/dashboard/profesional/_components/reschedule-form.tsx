"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Preview = { sameWeek: boolean; flags: string[]; warnings: string[] };

export default function RescheduleForm({ visitId, currentDate }: { visitId: string; currentDate: string | null }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = `/api/profesional/servicio/${visitId}/cambio-cita`;

  // Al elegir fecha se comprueban las reglas del plan y las preferencias del cliente.
  useEffect(() => {
    setPreview(null);
    setError(null);
    if (!date) return;
    let cancelled = false;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDate: date, preview: true }),
    })
      .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (cancelled) return;
        if (!ok) setError(d.error ?? "No se pudo comprobar la fecha");
        else setPreview(d);
      })
      .catch(() => !cancelled && setError("No se pudo comprobar la fecha"));
    return () => {
      cancelled = true;
    };
  }, [date, url]);

  const hasFlags = !!preview?.flags.length;

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newDate: date, reason }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo cambiar la cita");
      return;
    }
    router.push(`/dashboard/profesional/servicios/${visitId}`);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <p style={{ fontSize: 18 }}>
        Cita actual:{" "}
        <strong>{currentDate ? new Date(currentDate + "T00:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }) : "sin fecha"}</strong>
      </p>
      <p className="muted" style={{ fontSize: 16 }}>
        Use esto solo cuando haya acordado la nueva fecha con el cliente o con Portofino.
      </p>

      <div className="pro-field">
        <label htmlFor="nueva-fecha">Nueva fecha</label>
        <input id="nueva-fecha" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      {preview && !hasFlags && (
        <p style={{ fontSize: 17, color: "var(--gold)" }}>
          {preview.sameWeek ? "Es dentro de la misma semana: se cambia sin avisos." : "Sin incidencias: la semana encaja con el plan y con el cliente."}
        </p>
      )}

      {preview && hasFlags && (
        <>
          <div className="pro-warn">
            <strong>Atención: esta fecha está fuera de lo previsto</strong>
            <ul style={{ margin: "8px 0 0 18px" }}>
              {preview.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
            <p style={{ marginTop: 8 }}>Puede cambiarla igualmente, pero Portofino recibirá un aviso con su motivo.</p>
          </div>
          <div className="pro-field">
            <label htmlFor="motivo">Motivo del cambio (obligatorio)</label>
            <textarea id="motivo" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explique por qué cambia la cita" />
          </div>
        </>
      )}

      {error && <p className="error" style={{ fontSize: 16 }}>{error}</p>}

      <button className="pro-btn primary" disabled={busy || !preview || (hasFlags && !reason.trim())} onClick={save}>
        {busy ? "Guardando…" : hasFlags ? "Cambiar cita igualmente" : "Guardar nueva cita"}
      </button>
    </div>
  );
}
