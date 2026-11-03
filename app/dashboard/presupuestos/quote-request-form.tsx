"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GREMIOS = [
  { value: "carpinteria_madera", label: "Carpintería de madera" },
  { value: "albanileria_reforma", label: "Albañilería / reforma" },
  { value: "cristaleria", label: "Cristalería" },
  { value: "carpinteria_metalica", label: "Carpintería metálica" },
  { value: "reforma_general", label: "Reforma general" },
  { value: "pintura", label: "Pintura" },
];

export default function QuoteRequestForm({ properties, onSent }: { properties: { id: string; address: string }[]; onSent?: () => void }) {
  const router = useRouter();
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [gremios, setGremios] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggleGremio(value: string) {
    setGremios((prev) => (prev.includes(value) ? prev.filter((g) => g !== value) : [...prev, value]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gremios.length) {
      setError("Seleccione al menos un gremio");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch("/api/quote-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: propertyId || null, gremios, description }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo enviar la solicitud");
      return;
    }
    setDone(true);
    setDescription("");
    setGremios([]);
    router.refresh();
    onSent?.();
  }

  if (done) {
    return (
      <div>
        <p style={{ fontSize: 14, color: "var(--gold)", marginBottom: 16 }}>
          Solicitud enviada. Le enviaremos un presupuesto para que lo acepte o rechace.
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
        <label>Gremios necesarios (puede elegir varios)</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
          {GREMIOS.map((g) => (
            <label key={g.value} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 400 }}>
              <input type="checkbox" checked={gremios.includes(g.value)} onChange={() => toggleGremio(g.value)} />
              {g.label}
            </label>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Cuéntenos qué necesita</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="Describa detalladamente el trabajo que necesita. La fecha dependerá de la disponibilidad de nuestros profesionales — le enviaremos un presupuesto para que lo acepte o rechace."
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
