"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadTemplateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("file") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/contracts/template", { method: "POST", body: form });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo subir la plantilla");
      return;
    }
    setDone(true);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <input type="file" name="file" accept="application/pdf" required />
      <button className="btn" disabled={busy}>
        {busy ? "Subiendo…" : "Sustituir plantilla"}
      </button>
      {done && <span style={{ fontSize: 13, color: "var(--gold)" }}>Plantilla actualizada.</span>}
      {error && <span className="error">{error}</span>}
    </form>
  );
}
