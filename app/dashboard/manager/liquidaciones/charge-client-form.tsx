"use client";

import { useMemo, useState } from "react";
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

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <select value={clientId} onChange={(e) => handleClientChange(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}>
          {clientProperties.map((p) => <option key={p.id} value={p.id}>{p.address}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Concepto (p. ej. Firma — 45%)" required style={{ flex: 1, minWidth: 220, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }} />
        <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Importe €" required style={{ width: 140, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }} />
      </div>
      {error && <p className="error" style={{ marginBottom: 10 }}>{error}</p>}
      {done && <p style={{ color: "var(--gold)", marginBottom: 10, fontSize: 14 }}>Cobro realizado.</p>}
      <button className="btn" disabled={busy || !propertyId}>{busy ? "Cobrando…" : "Cobrar"}</button>
    </form>
  );
}
