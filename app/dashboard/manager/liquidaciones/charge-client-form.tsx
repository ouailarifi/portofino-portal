"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; full_name: string };
type Property = { id: string; address: string; client_id: string };

export default function ChargeClientForm({ clients, properties }: { clients: Client[]; properties: Property[] }) {
  const router = useRouter();
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const clientProperties = useMemo(() => properties.filter((p) => p.client_id === clientId), [properties, clientId]);
  const [propertyId, setPropertyId] = useState(clientProperties[0]?.id ?? "");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function handleClientChange(id: string) {
    setClientId(id);
    const first = properties.find((p) => p.client_id === id);
    setPropertyId(first?.id ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(false);
    const res = await fetch("/api/manager/charges", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId, concept, amount }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo cobrar");
      return;
    }
    setDone(true);
    setConcept("");
    setAmount("");
    router.refresh();
  }

  const inputStyle: CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 15, fontFamily: "inherit" };
  const labelStyle: CSSProperties = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>Cliente a cobrar</label>
          <select value={clientId} onChange={(e) => handleClientChange(e.target.value)} style={inputStyle}>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 200px" }}>
          <label style={labelStyle}>Vivienda</label>
          <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} style={inputStyle} disabled={!clientProperties.length}>
            {clientProperties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
          </select>
          {!clientProperties.length && <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>Este cliente no tiene ninguna vivienda dada de alta.</p>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ flex: "2 1 220px" }}>
          <label style={labelStyle}>Concepto del cobro</label>
          <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej.: Firma de presupuesto — 45%" required style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={labelStyle}>Importe a cobrar (€)</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required style={inputStyle} />
        </div>
      </div>
      {error && <p className="error" style={{ marginBottom: 10 }}>{error}</p>}
      {done && <p style={{ color: "var(--gold)", marginBottom: 10, fontSize: 14 }}>Cobro realizado.</p>}
      <button className="btn" disabled={busy || !propertyId}>{busy ? "Cobrando…" : "Cobrar"}</button>
    </form>
  );
}
