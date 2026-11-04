"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { phone: string; phone2: string; email: string; fiscalAddress: string };

export default function DatosForm(initial: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState(initial.phone);
  const [phone2, setPhone2] = useState(initial.phone2);
  const [fiscalAddress, setFiscalAddress] = useState(initial.fiscalAddress);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const res = await fetch("/api/profesional/datos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, phone2, fiscalAddress }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo guardar");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="pro-field">
        <label htmlFor="tel1">Teléfono 1</label>
        <input id="tel1" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="pro-field">
        <label htmlFor="tel2">Teléfono 2 (opcional)</label>
        <input id="tel2" type="tel" value={phone2} onChange={(e) => setPhone2(e.target.value)} />
      </div>
      <div className="pro-field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={initial.email} readOnly style={{ background: "var(--gold-bg)" }} />
        <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>Es el email con el que entra. Para cambiarlo, contacte con Portofino.</div>
      </div>
      <div className="pro-field">
        <label htmlFor="fiscal">Domicilio fiscal</label>
        <textarea id="fiscal" rows={2} value={fiscalAddress} onChange={(e) => setFiscalAddress(e.target.value)} />
      </div>

      {error && <p className="error" style={{ fontSize: 16 }}>{error}</p>}
      {saved && <p style={{ fontSize: 17, color: "var(--gold)" }}>Datos guardados.</p>}

      <button className="pro-btn primary" disabled={busy || !phone.trim()}>
        {busy ? "Guardando…" : "Guardar datos"}
      </button>
    </form>
  );
}
