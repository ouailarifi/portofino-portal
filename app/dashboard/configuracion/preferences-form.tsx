"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PreferencesForm({ visitPreference, callPreference }: { visitPreference: string; callPreference: string }) {
  const router = useRouter();
  const [visit, setVisit] = useState(visitPreference);
  const [call, setCall] = useState(callPreference);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    setError(null);
    const res = await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitPreference: visit, callPreference: call }),
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
    <form onSubmit={save} className="card" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="field">
        <label htmlFor="pref-visita">Preferencia de visita</label>
        <input id="pref-visita" value={visit} onChange={(e) => setVisit(e.target.value)} placeholder="Ej.: por las mañanas, entre semana" maxLength={300} />
      </div>
      <div className="field">
        <label htmlFor="pref-llamada">Preferencia de llamada</label>
        <input id="pref-llamada" value={call} onChange={(e) => setCall(e.target.value)} placeholder="Ej.: avisar por WhatsApp antes de llamar" maxLength={300} />
      </div>
      {error && <p className="error">{error}</p>}
      {saved && <p style={{ fontSize: 14, color: "var(--gold)", marginBottom: 12 }}>Preferencias guardadas.</p>}
      <div>
        <button className="btn" disabled={busy}>{busy ? "Guardando…" : "Guardar preferencias"}</button>
      </div>
    </form>
  );
}
