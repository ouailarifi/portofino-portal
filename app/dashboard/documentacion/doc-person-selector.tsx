"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Person = { id: string; label: string };

export default function DocPersonSelector({ people, basePath, selectedId }: { people: Person[]; basePath: string; selectedId?: string }) {
  const router = useRouter();
  const [id, setId] = useState(selectedId ?? people[0]?.id ?? "");

  function handleGo() {
    if (!id) return;
    router.push(`${basePath}&personaId=${id}`);
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <select value={id} onChange={(e) => setId(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)", fontSize: 14, fontFamily: "inherit", minWidth: 220 }}>
        {people.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      <button className="btn" onClick={handleGo} disabled={!id} style={{ padding: "8px 16px" }}>
        Ver documentación
      </button>
    </div>
  );
}
