"use client";

import { useState } from "react";

type Info = {
  address: string;
  billingMode: string;
  subscriptionStatus: string;
  commitmentEnd: string | null;
  insideCommitment: boolean;
  penaltyAmount: number;
  penaltyRatePct: number;
  remainingMonths: number;
  monthlyFee: number | null;
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default function CancelProperty({ propertyId, address }: { propertyId: string; address: string }) {
  const [step, setStep] = useState<"idle" | "loading" | "confirm" | "confirming" | "done" | "error">("idle");
  const [info, setInfo] = useState<Info | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ penaltyAmount: number; effectiveAt: string } | null>(null);

  async function openConfirm() {
    setStep("loading");
    const res = await fetch(`/api/properties/${propertyId}/cancel`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo comprobar la permanencia");
      setStep("error");
      return;
    }
    setInfo(data);
    setStep("confirm");
  }

  async function confirmCancel() {
    setStep("confirming");
    const res = await fetch(`/api/properties/${propertyId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo procesar la baja");
      setStep("error");
      return;
    }
    setResult(data);
    setStep("done");
  }

  if (step === "done" && result) {
    return (
      <p style={{ fontSize: 14, color: "var(--gold)" }}>
        Baja solicitada para {address}.{" "}
        {result.penaltyAmount > 0 && <>Se ha cobrado la penalización de {money(result.penaltyAmount)}. </>}
        Será efectiva el {fecha(result.effectiveAt)}. Le hemos enviado la confirmación por email, con copia a
        nuestro equipo.
      </p>
    );
  }

  if (step === "idle" || step === "loading" || step === "error") {
    return (
      <div>
        <button
          onClick={openConfirm}
          disabled={step === "loading"}
          style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "13px 22px", cursor: "pointer", fontFamily: "inherit" }}
        >
          {step === "loading" ? "Comprobando…" : "Dar de baja esta vivienda"}
        </button>
        {step === "error" && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  return (
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
      <div className="card" style={{ maxWidth: 540 }}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Confirmar baja — {address}</h2>
        <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
          {info?.insideCommitment ? (
            <>
              <p style={{ marginBottom: 10 }}>
                Esta vivienda tiene un <strong>compromiso de permanencia activo hasta el {fecha(info.commitmentEnd!)}</strong>{" "}
                (facturación anual).
              </p>
              {info.penaltyAmount > 0 ? (
                <p>
                  Se aplicará una deducción del <strong>{info.penaltyRatePct}%</strong> sobre las{" "}
                  <strong>{info.remainingMonths}</strong> cuotas no devengadas, en concepto de costes de
                  regularización administrativa y ajuste del compromiso anual: <strong>{money(info.penaltyAmount)}</strong>.
                  Se cobrará de inmediato con su método de pago guardado al confirmar.
                </p>
              ) : (
                <p>No se aplicará penalización — está dentro de los 3 primeros meses (periodo de prueba).</p>
              )}
            </>
          ) : (
            <p>Esta vivienda no tiene compromiso de permanencia pendiente. La baja será efectiva de inmediato y sin penalización.</p>
          )}
          <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 14, lineHeight: 1.5 }}>
            Derecho de desistimiento: conforme a la normativa española de protección al consumidor, dispone de 14
            días naturales desde la firma del contrato para desistir sin coste alguno, tanto si es particular como
            empresa. Nuestros 3 primeros meses de prueba sin penalización cubren y superan ese plazo legal.
          </p>
        </div>
        <div className="field">
          <label>Motivo (opcional)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nos ayuda a mejorar" />
        </div>
        {error && <p className="error">{error}</p>}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button className="btn" onClick={confirmCancel} disabled={step === "confirming"}>
            {step === "confirming" ? "Procesando…" : "Confirmar baja"}
          </button>
          <button
            onClick={() => setStep("idle")}
            disabled={step === "confirming"}
            style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "13px 22px", cursor: "pointer", fontFamily: "inherit" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
