"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { value: "dni", label: "DNI" },
  { value: "escrituras", label: "Escrituras de la vivienda" },
  { value: "otro", label: "Otro" },
];

export default function ClientDocumentsForm({ clientId, properties }: { clientId: string; properties: { id: string; address: string }[] }) {
  const router = useRouter();
  const [docType, setDocType] = useState("dni");
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("clientId", clientId);
    form.append("docType", docType);
    if (propertyId) form.append("propertyId", propertyId);
    const res = await fetch("/api/client-documents", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo subir el documento");
      return;
    }
    input.value = "";
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <select value={docType} onChange={(e) => setDocType(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}>
        {TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      {properties.length > 0 && (
        <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} style={{ padding: "8px 10px", borderRadius: 8, border: "1px solid var(--line)" }}>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.address}</option>
          ))}
        </select>
      )}
      <input type="file" name="file" required />
      <button className="btn" disabled={busy}>{busy ? "Subiendo…" : "Subir documento"}</button>
      {error && <span className="error">{error}</span>}
    </form>
  );
}
