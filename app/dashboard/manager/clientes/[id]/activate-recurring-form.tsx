"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

const PLANS = [
  { value: "essential", label: "Essential" },
  { value: "comfort", label: "Comfort" },
  { value: "premium", label: "Premium" },
];

export default function ActivateRecurringForm({ propertyId }: { propertyId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState(PLANS[0].value);
  const [billingMode, setBillingMode] = useState("flexible");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/manager/properties/${propertyId}/activate-recurring`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, billingMode, monthlyFee, startDate, endDate: endDate || null }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo dar de alta el cobro");
      return;
    }
    setDone(true);
    router.refresh();
  }

  const inputStyle: CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 13, fontFamily: "inherit" };
  const labelStyle: CSSProperties = { display: "block", fontSize: 11, color: "var(--muted)", marginBottom: 4 };

  if (done) return <p style={{ color: "var(--gold)", fontSize: 13 }}>Cobro recurrente dado de alta.</p>;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
        Dar de alta el pago recurrente
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12, marginTop: 8 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ flex: "1 1 120px" }}>
          <label style={labelStyle}>Plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} style={inputStyle}>
            {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <label style={labelStyle}>Modalidad</label>
          <select value={billingMode} onChange={(e) => setBillingMode(e.target.value)} style={inputStyle}>
            <option value="flexible">Flexible (mensual)</option>
            <option value="annual">Anual</option>
          </select>
        </div>
        <div style={{ flex: "1 1 120px" }}>
          <label style={labelStyle}>Cuota mensual (€)</label>
          <input type="number" min="0.01" step="0.01" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} required style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ flex: "1 1 140px" }}>
          <label style={labelStyle}>Desde</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required style={inputStyle} />
        </div>
        <div style={{ flex: "1 1 140px" }}>
          <label style={labelStyle}>Hasta (opcional)</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={inputStyle} />
        </div>
      </div>
      {error && <p className="error" style={{ fontSize: 12, marginBottom: 8 }}>{error}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn" disabled={busy} style={{ padding: "6px 14px", fontSize: 13 }}>{busy ? "Dando de alta…" : "Confirmar alta"}</button>
        <button type="button" onClick={() => setOpen(false)} style={{ fontSize: 12, border: "none", background: "none", color: "var(--muted)", cursor: "pointer", fontFamily: "inherit" }}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
