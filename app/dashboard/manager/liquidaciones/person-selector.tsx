"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = { id: string; label: string };

export default function PersonSelector({
  clients,
  professionals,
  selectedTipo,
  selectedId,
}: {
  clients: Person[];
  professionals: Person[];
  selectedTipo?: string;
  selectedId?: string;
}) {
  const router = useRouter();
  const [tipo, setTipo] = useState(selectedTipo ?? "cliente");
  const list = tipo === "cliente" ? clients : professionals;
  const [id, setId] = useState(selectedId ?? list[0]?.id ?? "");

  function handleTipoChange(next: string) {
    setTipo(next);
    const nextList = next === "cliente" ? clients : professionals;
    setId(nextList[0]?.id ?? "");
  }

  function handleGo() {
    if (!id) return;
    router.push(`/dashboard/manager/liquidaciones?tipo=${tipo}&id=${id}`);
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <select value={tipo} onChange={(e) => handleTipoChange(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit" }}>
        <option value="cliente">Cliente</option>
        <option value="profesional">Profesional</option>
      </select>
      <select value={id} onChange={(e) => setId(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit", minWidth: 220 }}>
        {list.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <button className="btn" onClick={handleGo} disabled={!id} style={{ padding: "8px 16px" }}>
        Ver acciones
      </button>
    </div>
  );
}
