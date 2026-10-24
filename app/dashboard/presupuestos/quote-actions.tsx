"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const money = (n: number) =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default function QuoteActions({ quoteId, amountTotal }: { quoteId: string; amountTotal: number }) {
  const [showLegal, setShowLegal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);
  const supabase = createClient();

  const deposit = amountTotal * 0.1;
  const signature = amountTotal * 0.45;
  const final = amountTotal * 0.45;

  async function handleReject() {
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("respond_to_quote", { p_quote_id: quoteId, p_decision: "rechazado" });
    setBusy(false);
    if (error) setError(error.message);
    else setRejected(true);
  }

  async function handleConfirmAccept() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/quotes/${quoteId}/checkout`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setBusy(false);
      setError(data.error ?? "No se pudo iniciar el pago");
      return;
    }
    window.location.href = data.url;
  }

  if (rejected) return <p className="muted" style={{ fontSize: 14 }}>Presupuesto rechazado.</p>;

  return (
    <>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button className="btn" onClick={() => setShowLegal(true)} disabled={busy}>
          Aceptar presupuesto
        </button>
        <button
          onClick={handleReject}
          disabled={busy}
          style={{
            background: "none",
            border: "1px solid var(--line)",
            borderRadius: 8,
            padding: "13px 22px",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Rechazar
        </button>
      </div>
      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}

      {showLegal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(14,29,64,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 50,
          }}
        >
          <div className="card" style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: 22, marginBottom: 16 }}>Condiciones de aceptación</h2>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink)" }}>
              <p style={{ marginBottom: 12 }}>
                Al aceptar este presupuesto de <strong>{money(amountTotal)}</strong>, el cliente queda vinculado
                contractualmente a su ejecución bajo las siguientes condiciones de pago:
              </p>
              <ul style={{ paddingLeft: 20, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                <li>
                  <strong>{money(deposit)} (10%)</strong> se cargará de inmediato como compromiso de reserva y gastos
                  de gestión. <strong>Transcurridas 24 horas desde la aceptación, este importe no es reembolsable</strong>,
                  con independencia de que la obra llegue a iniciarse.
                </li>
                <li>
                  <strong>{money(signature)} (45%)</strong> se abonará mediante transferencia bancaria tras la
                  corrección definitiva de medidas, la elección final de materiales y la firma presencial del contrato
                  de obra.
                </li>
                <li>
                  <strong>{money(final)} (45%)</strong> restante se abonará a la finalización y entrega de la obra.
                </li>
              </ul>
              <p className="muted" style={{ fontSize: 13 }}>
                Este resumen no sustituye al contrato de obra completo, que se formalizará por escrito y con firma
                presencial antes del inicio de los trabajos. Al pulsar "Confirmar y pagar" se procederá al cargo
                inmediato del 10% indicado.
              </p>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
              <button className="btn" onClick={handleConfirmAccept} disabled={busy}>
                {busy ? "Redirigiendo…" : `Confirmar y pagar ${money(deposit)}`}
              </button>
              <button
                onClick={() => setShowLegal(false)}
                disabled={busy}
                style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "13px 22px", cursor: "pointer", fontFamily: "inherit" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
