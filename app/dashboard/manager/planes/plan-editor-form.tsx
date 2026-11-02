"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Plan = {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  price: number;
  items: string[];
  active: boolean;
};

export default function PlanEditorForm({ plan }: { plan: Plan }) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(plan.name);
  const [subtitle, setSubtitle] = useState(plan.subtitle ?? "");
  const [price, setPrice] = useState(String(plan.price));
  const [itemsText, setItemsText] = useState((plan.items ?? []).join("\n"));
  const [active, setActive] = useState(plan.active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setBusy(true);
    setError(null);
    const items = itemsText.split("\n").map((l) => l.trim()).filter(Boolean);
    const { error } = await supabase
      .from("plans")
      .update({ name, subtitle: subtitle || null, price: Number(price), items, active, updated_at: new Date().toISOString() })
      .eq("id", plan.id);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="muted"
        style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}
      >
        Modificar plan
      </button>
    );
  }

  return (
    <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 16 }}>
      <div className="field">
        <label>Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Subtítulo</label>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </div>
      <div className="field">
        <label>Precio (€/mes)</label>
        <input type="number" step="1" value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>
      <div className="field">
        <label>Lo que incluye (una línea por punto)</label>
        <textarea rows={8} value={itemsText} onChange={(e) => setItemsText(e.target.value)} />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, fontSize: 14 }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Plan activo (visible para los clientes)
      </label>
      {error && <p className="error">{error}</p>}
      <div style={{ display: "flex", gap: 10 }}>
        <button className="btn" onClick={handleSave} disabled={busy} style={{ padding: "10px 18px" }}>
          {busy ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={busy}
          style={{ background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "10px 18px", cursor: "pointer", fontFamily: "inherit" }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
