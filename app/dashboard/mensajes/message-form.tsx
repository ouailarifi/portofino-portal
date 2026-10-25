"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Property = { id: string; address: string };

export default function MessageForm({ properties }: { properties: Property[] }) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/client-messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, propertyId: propertyId || null }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar el mensaje");
      return;
    }
    setMessage("");
    setSent(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {properties.length > 0 && (
        <div className="field">
          <label>Vivienda (opcional)</label>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">General</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
        </div>
      )}
      <div className="field">
        <label>Mensaje</label>
        <textarea value={message} onChange={(e) => { setMessage(e.target.value); setSent(false); }} rows={4} required />
      </div>
      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
      {sent && <p style={{ color: "var(--gold)", marginBottom: 12, fontSize: 14 }}>Mensaje enviado.</p>}
      <button className="btn" disabled={busy}>{busy ? "Enviando…" : "Enviar mensaje"}</button>
    </form>
  );
}
