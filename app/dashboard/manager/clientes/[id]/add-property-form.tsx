"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartamento" },
  { value: "house", label: "Casa" },
  { value: "villa", label: "Villa" },
  { value: "luxury_villa", label: "Villa de lujo" },
];
const PLANS = [
  { value: "essential", label: "Essential" },
  { value: "comfort", label: "Comfort" },
  { value: "premium", label: "Premium" },
];

export default function AddPropertyForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [propertyType, setPropertyType] = useState(PROPERTY_TYPES[0].value);
  const [zone, setZone] = useState("");
  const [plan, setPlan] = useState(PLANS[0].value);
  const [billingMode, setBillingMode] = useState("annual");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [clientType, setClientType] = useState("particular");
  const [contractStartDate, setContractStartDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/manager/clients/${clientId}/properties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, propertyType, zone, plan, billingMode, monthlyFee, clientType, contractStartDate }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo dar de alta la vivienda");
      return;
    }
    setOpen(false);
    setAddress("");
    setZone("");
    setMonthlyFee("");
    setContractStartDate("");
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)} style={{ padding: "8px 16px" }}>
        Dar de alta una vivienda
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
      <div>
        <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Dirección</label>
        <input
          required
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
        />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Tipo de vivienda</label>
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}>
            {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Zona (opcional)</label>
          <input
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
          />
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Plan</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}>
            {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Facturación</label>
          <select value={billingMode} onChange={(e) => setBillingMode(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}>
            <option value="annual">Anual</option>
            <option value="flexible">Flexible</option>
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Cuota mensual (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={monthlyFee}
            onChange={(e) => setMonthlyFee(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Tipo de cliente</label>
          <select value={clientType} onChange={(e) => setClientType(e.target.value)} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}>
            <option value="particular">Particular</option>
            <option value="empresa">Empresa</option>
          </select>
        </div>
      </div>
      <div>
        <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Fecha de inicio de contrato (opcional, hoy por defecto)</label>
        <input
          type="date"
          value={contractStartDate}
          onChange={(e) => setContractStartDate(e.target.value)}
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
        />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn" disabled={busy} style={{ padding: "8px 16px" }}>{busy ? "Creando…" : "Dar de alta"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)} style={{ padding: "8px 16px" }}>Cancelar</button>
      </div>
      {error && <span className="error" style={{ fontSize: 12 }}>{error}</span>}
      <p className="muted" style={{ fontSize: 12 }}>
        Esto solo da de alta la vivienda. El cobro recurrente se activa después, en el bloque de Liquidaciones de abajo.
      </p>
    </form>
  );
}
