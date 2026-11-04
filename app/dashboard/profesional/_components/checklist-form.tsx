"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/compress-image";

type Item = { key: string; label: string; done: boolean; photoUrl: string | null };

export default function ChecklistForm({ visitId, initial, readOnly }: { visitId: string; initial: Item[]; readOnly: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>(initial);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Las peticiones se encadenan para no pisar el estado guardado de la checklist.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  function save(key: string, fd: FormData, apply: (it: Item, photoUrl?: string | null) => Item, localPhoto?: string) {
    fd.set("key", key);
    setBusyKey(key);
    setError(null);
    queue.current = queue.current.then(async () => {
      try {
        const res = await fetch(`/api/profesional/servicio/${visitId}/checklist`, { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
        setItems((prev) => prev.map((it) => (it.key === key ? apply(it, localPhoto) : it)));
        router.refresh();
      } catch (e: any) {
        setError(e.message ?? "No se pudo guardar. Compruebe la conexión.");
      } finally {
        setBusyKey((k) => (k === key ? null : k));
      }
    });
  }

  function toggle(it: Item) {
    const fd = new FormData();
    fd.set("done", it.done ? "0" : "1");
    save(it.key, fd, (cur) => ({ ...cur, done: !it.done }));
  }

  async function addPhoto(it: Item, file: File | undefined) {
    if (!file) return;
    setBusyKey(it.key);
    const small = await compressImage(file);
    const fd = new FormData();
    fd.set("file", small);
    save(it.key, fd, (cur, url) => ({ ...cur, done: true, photoUrl: url ?? cur.photoUrl }), URL.createObjectURL(small));
  }

  const done = items.filter((i) => i.done).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 18 }}>
        <strong>{done}</strong> de {items.length} revisados
      </p>

      {items.map((it) => (
        <div key={it.key} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, borderColor: it.done ? "var(--gold)" : "var(--line)" }}>
          <button
            type="button"
            onClick={() => toggle(it)}
            disabled={readOnly || busyKey === it.key}
            style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "none", border: "none", textAlign: "left", fontFamily: "inherit", fontSize: 18, cursor: "pointer", padding: 0 }}
          >
            <span
              aria-hidden
              style={{
                flex: "0 0 34px",
                height: 34,
                borderRadius: 8,
                border: "2px solid var(--gold)",
                background: it.done ? "var(--gold)" : "#fff",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              {it.done ? "✓" : ""}
            </span>
            <span style={{ lineHeight: 1.4 }}>{it.label}</span>
          </button>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {it.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.photoUrl} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10, border: "1px solid var(--line)" }} />
            )}
            {!readOnly && (
              <label className="pro-btn" style={{ minHeight: 56, width: "auto", fontSize: 17, padding: "10px 18px", cursor: "pointer" }}>
                {busyKey === it.key ? "Subiendo…" : it.photoUrl ? "Cambiar foto" : "Hacer foto"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  disabled={busyKey === it.key}
                  onChange={(e) => {
                    addPhoto(it, e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>
      ))}

      {!items.length && <p className="muted" style={{ fontSize: 18 }}>Este plan no tiene puntos de checklist.</p>}
      {error && <p className="error" style={{ fontSize: 16 }}>{error}</p>}
    </div>
  );
}
