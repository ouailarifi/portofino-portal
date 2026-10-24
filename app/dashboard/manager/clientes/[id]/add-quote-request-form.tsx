"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GREMIOS = [
  { value: "carpinteria_madera", label: "Carpintería de madera" },
  { value: "albanileria_reforma", label: "Albañilería / reforma" },
  { value: "cristaleria", label: "Cristalería" },
  { value: "carpinteria_metalica", label: "Carpintería metálica" },
  { value: "reforma_general", label: "Reforma general" },
];
const CANALES = [
  { value: "email", label: "Email" },
  { value: "telefono", label: "Teléfono" },
  { value: "otro", label: "Otro" },
];

export default function AddQuoteRequestForm({ clientId, properties }: { clientId: string; properties: { id: string; address: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [gremio, setGremio] = useState(GREMIOS[0].value);
  const [canal, setCanal] = useState("email");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/manager/quote-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, propertyId: propertyId || null, gremio, canal, description }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar la solicitud");
      return;
    }
    setDescription("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)}>
        Registrar solicitud recibida por email/teléfono
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <select value={canal} onChange={(e) => setCanal(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}>
          {CANALES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <select value={gremio} onChange={(e) => setGremio(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}>
          {GREMIOS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
        {properties.length > 0 && (
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
        )}
      </div>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
        placeholder="Pegue aquí el mensaje recibido o un resumen"
        required
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontFamily: "inherit", marginBottom: 10 }}
      />
      {error && <p className="error" style={{ marginBottom: 10 }}>{error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn" disabled={busy}>{busy ? "Guardando…" : "Guardar solicitud"}</button>
        <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "13px 22px", cursor: "pointer", fontFamily: "inherit" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
