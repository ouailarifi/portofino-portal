"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  { value: "rc_poliza", label: "Póliza de RC" },
  { value: "rc_recibo", label: "Recibo de RC" },
  { value: "dni_anverso", label: "DNI (anverso)" },
  { value: "dni_reverso", label: "DNI (reverso)" },
  { value: "contrato_colaboracion", label: "Contrato de colaboración firmado" },
  { value: "certificado_contratistas", label: "Certificado de contratistas y subcontratistas" },
  { value: "certificado_bancario", label: "Certificado de cuenta bancaria" },
  { value: "foto", label: "Foto" },
  { value: "otro", label: "Otro" },
];

export default function ProfessionalDocumentsForm({ professionalId }: { professionalId: string }) {
  const router = useRouter();
  const [docType, setDocType] = useState("dni_anverso");
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
    form.append("professionalId", professionalId);
    form.append("docType", docType);
    const res = await fetch("/api/professional-documents", { method: "POST", body: form });
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
        {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input type="file" name="file" required />
      <button className="btn" disabled={busy}>{busy ? "Subiendo…" : "Subir documento"}</button>
      {error && <span className="error">{error}</span>}
    </form>
  );
}
