"use client";

import { useState } from "react";

export default function ConnectOnboardingButton({ professionalId, status }: { professionalId: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/manager/professionals/${professionalId}/connect-onboarding`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo generar el enlace");
      return;
    }
    window.open(data.url, "_blank");
  }

  const label = status === "activa" ? "Ver/actualizar datos en Stripe" : status === "en_revision" ? "Continuar verificación en Stripe" : "Dar de alta en Stripe Connect";

  return (
    <div>
      <button onClick={handleClick} disabled={busy} className="btn" style={{ padding: "10px 16px" }}>
        {busy ? "Generando enlace…" : label}
      </button>
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
      <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
        Se abre la página segura de Stripe. El profesional introduce ahí sus datos bancarios (IBAN) directamente — nunca pasan por nuestro servidor.
      </p>
    </div>
  );
}
