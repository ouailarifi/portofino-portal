"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  visitId: string;
  status: string;
  arrivedAt: string | null;
  checklistDone: number;
  checklistTotal: number;
};

// Los cinco botones de "Mi servicio": Cambio de cita, Estoy aquí, Incidencia, Checklist, Cerrar servicio.
export default function ServiceButtons({ visitId, status, arrivedAt, checklistDone, checklistTotal }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const base = `/dashboard/profesional/servicios/${visitId}`;
  const open = status === "programada";

  async function send(action: "llegada" | "cerrar") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/profesional/servicio/${visitId}/estado`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar. Inténtelo de nuevo.");
      return;
    }
    setConfirmClose(false);
    if (action === "cerrar") router.push("/dashboard/profesional/servicios");
    router.refresh();
  }

  if (!open) {
    return <p className="muted" style={{ fontSize: 18 }}>Este servicio ya está cerrado.</p>;
  }

  const pendientes = checklistTotal - checklistDone;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Link href={`${base}/cambio-cita`} className="pro-btn">
        <span>Cambio de cita</span>
        <span>→</span>
      </Link>

      <button className={arrivedAt ? "pro-btn" : "pro-btn primary"} disabled={busy || !!arrivedAt} onClick={() => send("llegada")}>
        <span>
          Estoy aquí
          <small>
            {arrivedAt
              ? `Llegada registrada a las ${new Date(arrivedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
              : "Pulse al llegar a la vivienda"}
          </small>
        </span>
        <span>{arrivedAt ? "✓" : ""}</span>
      </button>

      <Link href={`${base}/incidencia`} className="pro-btn">
        <span>Incidencia</span>
        <span>→</span>
      </Link>

      <Link href={`${base}/checklist`} className="pro-btn">
        <span>
          Checklist
          <small>{checklistTotal ? `${checklistDone} de ${checklistTotal} revisados` : "Sin puntos"}</small>
        </span>
        <span>→</span>
      </Link>

      {!confirmClose ? (
        <button className="pro-btn" disabled={!arrivedAt || busy} onClick={() => setConfirmClose(true)}>
          <span>
            Cerrar servicio
            <small>{arrivedAt ? "Pulse al terminar y salir" : "Primero pulse «Estoy aquí»"}</small>
          </span>
        </button>
      ) : (
        <div className="card" style={{ border: "2px solid var(--gold)" }}>
          <p style={{ fontSize: 18, marginBottom: 6 }}><strong>¿Cerrar el servicio?</strong></p>
          {pendientes > 0 && (
            <p className="pro-warn" style={{ marginBottom: 12 }}>
              Aún quedan {pendientes} punto{pendientes === 1 ? "" : "s"} de la checklist sin revisar.
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button className="pro-btn primary" disabled={busy} onClick={() => send("cerrar")} style={{ minHeight: 64 }}>
              {busy ? "Cerrando…" : "Sí, cerrar servicio"}
            </button>
            <button className="pro-btn quiet" disabled={busy} onClick={() => setConfirmClose(false)} style={{ minHeight: 64 }}>
              No, volver
            </button>
          </div>
        </div>
      )}

      {error && <p className="error" style={{ fontSize: 16 }}>{error}</p>}
    </div>
  );
}
