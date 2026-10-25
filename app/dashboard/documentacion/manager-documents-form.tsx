"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { value: "contrato_generico", label: "Contrato tipo genérico" },
  { value: "rc_propio", label: "Nuestro seguro de RC" },
  { value: "recibo_rc_propio", label: "Nuestro recibo de RC" },
  { value: "otro", label: "Otro" },
];

export default function ManagerDocumentsForm() {
  const router = useRouter();
  const [docType, setDocType] = useState(TYPES[0].value);
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
    form.append("docType", docType);
    const res = await fetch("/api/manager-documents", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
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
        {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input type="file" name="file" required />
      <button className="btn" disabled={busy}>{busy ? "Subiendo…" : "Subir documento"}</button>
      {error && <span className="error">{error}</span>}
    </form>
  );
}
