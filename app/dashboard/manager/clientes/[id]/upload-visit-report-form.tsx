"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadVisitReportForm({ visitId, hasReport }: { visitId: string; hasReport: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/manager/visits/${visitId}/report`, { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo subir el informe");
      return;
    }
    if (inputRef.current) inputRef.current.value = "";
    router.refresh();
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <input ref={inputRef} type="file" accept="application/pdf" onChange={handleFile} disabled={busy} style={{ display: "none" }} id={`report-${visitId}`} />
      <label htmlFor={`report-${visitId}`} className="muted" style={{ fontSize: 12, textDecoration: "underline", cursor: "pointer" }}>
        {busy ? "Subiendo…" : hasReport ? "Sustituir PDF" : "Subir PDF"}
      </label>
      {error && <span className="error" style={{ fontSize: 11 }}>{error}</span>}
    </span>
  );
}
