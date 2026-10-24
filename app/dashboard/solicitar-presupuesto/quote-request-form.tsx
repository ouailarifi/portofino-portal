"use client";

import { useState } from "react";

const GREMIOS = [
  { value: "carpinteria_madera", label: "Carpintería de madera" },
  { value: "albanileria_reforma", label: "Albañilería / reforma" },
  { value: "cristaleria", label: "Cristalería" },
  { value: "carpinteria_metalica", label: "Carpintería metálica" },
  { value: "reforma_general", label: "Reforma general" },
];

export default function QuoteRequestForm({ properties }: { properties: { id: string; address: string }[] }) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [gremio, setGremio] = useState(GREMIOS[0].value);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/quote-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: propertyId || null, gremio, description }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar la solicitud");
      return;
    }
    setDone(true);
    setDescription("");
  }

  if (done) {
    return (
      <div>
        <p style={{ fontSize: 14, color: "var(--gold)", marginBottom: 16 }}>
          Solicitud enviada. Le llamaremos en breve para darle un presupuesto.
        </p>
        <button className="btn" onClick={() => setDone(false)}>
          Enviar otra solicitud
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {properties.length > 0 && (
        <div className="field">
          <label>Vivienda (opcional)</label>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
            <option value="">No especificar</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="field">
        <label>Gremio</label>
        <select value={gremio} onChange={(e) => setGremio(e.target.value)}>
          {GREMIOS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Cuéntenos qué necesita</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="Describa el trabajo que necesita para que podamos valorarlo y llamarle con un presupuesto"
          required
        />
      </div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      <button className="btn" disabled={busy}>
        {busy ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}
