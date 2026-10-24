"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AssignProfessionalSelect({
  type,
  id,
  current,
  professionals,
}: {
  type: "quote_request" | "quote" | "visit";
  id: string;
  current: string | null;
  professionals: { id: string; full_name: string; codigo_profesional: string | null }[];
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? "");
  const [busy, setBusy] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const professionalId = e.target.value;
    setValue(professionalId);
    setBusy(true);
    await fetch("/api/manager/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id, professionalId: professionalId || null }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <select value={value} onChange={handleChange} disabled={busy} style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--line)", fontSize: 13 }}>
      <option value="">Sin asignar</option>
      {professionals.map((p) => (
        <option key={p.id} value={p.id}>
          {p.codigo_profesional ?? ""} {p.full_name}
        </option>
      ))}
    </select>
  );
}
