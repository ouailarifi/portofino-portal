"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PropertyOption = { id: string; address: string };

export default function GenerateInvoiceForm({
  clientId,
  properties,
}: {
  clientId: string;
  properties: PropertyOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [concept, setConcept] = useState("");
  const [baseAmount, setBaseAmount] = useState("");
  const [ivaRate, setIvaRate] = useState("21");
  const [propertyId, setPropertyId] = useState("");
  const [serviceNumber, setServiceNumber] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResultUrl(null);
    const res = await fetch("/api/manager/invoices/factura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        propertyId: propertyId || null,
        concept,
        baseAmount,
        ivaRate: ivaRate === "exento" ? null : ivaRate,
        serviceNumber: serviceNumber || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo generar la factura");
      return;
    }
    setResultUrl(data.url ?? null);
    setConcept("");
    setBaseAmount("");
    setServiceNumber("");
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)} style={{ padding: "8px 16px" }}>
        Generar factura
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 480 }}>
      <div>
        <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Concepto</label>
        <input
          required
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          placeholder="Ej.: Cuota mensual Premium — octubre"
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
        />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Base imponible (€)</label>
          <input
            required
            type="number"
            step="0.01"
            min="0.01"
            value={baseAmount}
            onChange={(e) => setBaseAmount(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>IVA</label>
          <select
            value={ivaRate}
            onChange={(e) => setIvaRate(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
          >
            <option value="21">21% (general)</option>
            <option value="10">10% (reducido)</option>
            <option value="exento">Exento / sin IVA</option>
          </select>
        </div>
      </div>
      {properties.length > 0 && (
        <div>
          <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Vivienda relacionada (opcional)</label>
          <select
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
          >
            <option value="">— Ninguna —</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>
        </div>
      )}
      <div>
        <label className="muted" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Nº de servicio relacionado (opcional)</label>
        <input
          value={serviceNumber}
          onChange={(e) => setServiceNumber(e.target.value)}
          placeholder="Ej.: SRV-2026-0001-01"
          style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
        />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn" disabled={busy} style={{ padding: "8px 16px" }}>{busy ? "Generando…" : "Generar y enviar"}</button>
        <button type="button" className="btn-ghost" onClick={() => setOpen(false)} style={{ padding: "8px 16px" }}>Cancelar</button>
      </div>
      {error && <span className="error" style={{ fontSize: 12 }}>{error}</span>}
      {resultUrl && (
        <span style={{ color: "var(--gold)", fontSize: 12 }}>
          Factura generada y enviada por email.{" "}
          <a href={resultUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>Ver PDF</a>
        </span>
      )}
    </form>
  );
}
