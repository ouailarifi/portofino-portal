"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage, MAX_UPLOAD_BYTES } from "@/lib/compress-image";

type Doc = { id: string; label: string; url: string | null };

// Tarjeta de un documento del profesional: estado, archivos subidos y botón para subir/sustituir.
export default function DocUpload({ docType, title, hint, docs }: { docType: string; title: string; hint?: string; docs: Doc[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    const ready = await compressImage(file);
    if (ready.size > MAX_UPLOAD_BYTES) {
      setBusy(false);
      setError("El archivo pesa demasiado (máximo 4 MB). Haga una foto en lugar de subir el PDF, o reduzca el PDF.");
      return;
    }
    const fd = new FormData();
    fd.set("file", ready);
    fd.set("docType", docType);
    const res = await fetch("/api/profesional/documentos", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo subir. Inténtelo de nuevo.");
      return;
    }
    router.refresh();
  }

  async function remove(id: string) {
    if (!window.confirm("¿Quitar este documento?")) return;
    setBusy(true);
    await fetch(`/api/profesional/documentos/${id}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10, borderColor: docs.length ? "var(--gold)" : "var(--line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <strong style={{ fontSize: 20 }}>{title}</strong>
        <span style={{ fontSize: 15, color: docs.length ? "var(--gold)" : "var(--muted)" }}>{docs.length ? "✓ Subido" : "Falta"}</span>
      </div>
      {hint && <div className="muted" style={{ fontSize: 14 }}>{hint}</div>}

      {docs.map((d) => (
        <div key={d.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", fontSize: 15, flexWrap: "wrap" }}>
          <span style={{ wordBreak: "break-all" }}>{d.label}</span>
          <span style={{ display: "flex", gap: 14 }}>
            {d.url && (
              <a href={d.url} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>
                Ver
              </a>
            )}
            <button onClick={() => remove(d.id)} disabled={busy} className="muted" style={{ background: "none", border: "none", textDecoration: "underline", cursor: "pointer", fontSize: 15, fontFamily: "inherit" }}>
              Quitar
            </button>
          </span>
        </div>
      ))}

      <label className="pro-btn" style={{ minHeight: 60, fontSize: 18, cursor: "pointer", justifyContent: "center" }}>
        {busy ? "Subiendo…" : docs.length ? "Subir otro / sustituir" : "Subir foto o PDF"}
        <input
          type="file"
          accept="image/*,application/pdf"
          hidden
          disabled={busy}
          onChange={(e) => {
            upload(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      {error && <p className="error" style={{ fontSize: 15, margin: 0 }}>{error}</p>}
    </div>
  );
}
