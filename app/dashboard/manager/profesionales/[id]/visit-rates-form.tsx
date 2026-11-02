"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Rate = { id: string; visit_type: string; price: number };

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default function VisitRatesForm({ professionalId, rates }: { professionalId: string; rates: Rate[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [visitType, setVisitType] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("professional_visit_rates")
      .upsert({ professional_id: professionalId, visit_type: visitType.trim(), price: Number(price) }, { onConflict: "professional_id,visit_type" });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setVisitType("");
    setPrice("");
    router.refresh();
  }

  async function handleDelete(id: string) {
    await supabase.from("professional_visit_rates").delete().eq("id", id);
    router.refresh();
  }

  return (
    <div className="card">
      <strong>Tarifas por tipo de visita</strong>
      <p className="muted" style={{ fontSize: 13, marginTop: 6, marginBottom: 14 }}>
        Referencia de precio por tipo de visita para este profesional. Al pagar un servicio, consulta aquí el importe.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {rates.map((r) => (
          <div key={r.id} className="visit-row" style={{ fontSize: 14 }}>
            <span>{r.visit_type}</span>
            <span style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {money(Number(r.price))}
              <button onClick={() => handleDelete(r.id)} className="muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}>
                Borrar
              </button>
            </span>
          </div>
        ))}
        {!rates.length && <p className="muted" style={{ fontSize: 14 }}>Sin tarifas definidas todavía.</p>}
      </div>
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          required
          value={visitType}
          onChange={(e) => setVisitType(e.target.value)}
          placeholder="Ej.: Visita estándar"
          style={{ flex: "1 1 180px", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
        />
        <input
          required
          type="number"
          step="0.01"
          min="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="€"
          style={{ width: 100, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}
        />
        <button className="btn" disabled={busy} style={{ padding: "8px 16px" }}>{busy ? "…" : "Guardar"}</button>
      </form>
      {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
    </div>
  );
}
