"use client";

import { useState } from "react";

type Info = {
  address: string;
  billingMode: string;
  subscriptionStatus: string;
  commitmentEnd: string | null;
  insideCommitment: boolean;
};

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

export default function CancelProperty({ propertyId, address }: { propertyId: string; address: string }) {
  const [step, setStep] = useState<"idle" | "loading" | "confirm" | "done" | "error">("idle");
  const [info, setInfo] = useState<Info | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [effectiveAt, setEffectiveAt] = useState<string | null>(null);

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
    setEffectiveAt(data.effectiveAt);
    setStep("done");
  }

  if (step === "done") {
    return (
      <p style={{ fontSize: 14, color: "var(--gold)" }}>
        Baja solicitada para {address}. Será efectiva el {effectiveAt && fecha(effectiveAt)}. Le hemos enviado la
        confirmación por email, con copia a nuestro equipo.
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
      <div className="card" style={{ maxWidth: 520 }}>
        <h2 style={{ fontSize: 22, marginBottom: 16 }}>Confirmar baja — {address}</h2>
        <div style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 16 }}>
          {info?.insideCommitment ? (
            <p>
              Esta vivienda tiene un <strong>compromiso de permanencia activo hasta el {fecha(info.commitmentEnd!)}</strong>{" "}
              (facturación anual). La baja quedará registrada ahora, pero será efectiva en esa fecha, salvo que
              apliquen las condiciones de cancelación anticipada de su contrato.
            </p>
          ) : (
            <p>Esta vivienda no tiene compromiso de permanencia pendiente. La baja será efectiva de inmediato.</p>
          )}
        </div>
        <div className="field">
          <label>Motivo (opcional)</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nos ayuda a mejorar" />
        </div>
        {error && <p className="error">{error}</p>}
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button className="btn" onClick={confirmCancel}>
            Confirmar baja
          </button>
          <button
            onClick={() => setStep("idle")}
            style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "13px 22px", cursor: "pointer", fontFamily: "inherit" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
