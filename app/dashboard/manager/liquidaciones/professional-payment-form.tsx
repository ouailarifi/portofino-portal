"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

type Professional = { id: string; full_name: string; codigo_profesional: string | null };

export default function ProfessionalPaymentForm({ professionals }: { professionals: Professional[] }) {
  const router = useRouter();
  const [professionalId, setProfessionalId] = useState(professionals[0]?.id ?? "");
  const [concept, setConcept] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/manager/professional-payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professionalId, concept, amount }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo registrar");
      return;
    }
    setConcept("");
    setAmount("");
    router.refresh();
  }

  if (!professionals.length) return <p className="muted" style={{ fontSize: 14 }}>Da de alta un profesional primero.</p>;

  const inputStyle: CSSProperties = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 15, fontFamily: "inherit" };
  const labelStyle: CSSProperties = { display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 180px" }}>
          <label style={labelStyle}>Profesional a pagar</label>
          <select value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} style={inputStyle}>
            {professionals.map((p) => <option key={p.id} value={p.id}>{p.codigo_profesional} — {p.full_name}</option>)}
          </select>
        </div>
        <div style={{ flex: "2 1 220px" }}>
          <label style={labelStyle}>Concepto</label>
          <input value={concept} onChange={(e) => setConcept(e.target.value)} placeholder="Ej.: Visita del 12/11" required style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <label style={labelStyle}>Importe (€)</label>
          <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required style={inputStyle} />
        </div>
        <button className="btn" disabled={busy} style={{ padding: "11px 20px" }}>{busy ? "Guardando…" : "Añadir"}</button>
      </div>
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
    </form>
  );
}
