"use client";

import { useEffect, useRef, useState } from "react";
import { compressImage } from "@/lib/compress-image";

type Saved = { path: string; url: string };
type Pending = { id: string; file: File; preview: string };
type Item = { key: string; label: string; done: boolean; photos: Saved[] };
type Draft = { done: boolean; removed: string[]; added: Pending[] };

const MAX_PHOTOS = 10; // mismo límite que el servidor

export default function ChecklistForm({ visitId, initial, readOnly }: { visitId: string; initial: Item[]; readOnly: boolean }) {
  // Lo guardado en el servidor (se actualiza tras cada «Guardar»).
  const [saved, setSaved] = useState<Item[]>(initial);
  // Cambios sin guardar de cada punto.
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(initial.map((i) => [i.key, { done: i.done, removed: [], added: [] }]))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState(false);

  const dirty = saved.some((it) => {
    const d = drafts[it.key];
    return d && (d.done !== it.done || d.removed.length > 0 || d.added.length > 0);
  });

  // Avisa si se intenta cerrar la pestaña con cambios sin guardar.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  function patch(key: string, fn: (d: Draft) => Draft) {
    setOkMsg(false);
    setDrafts((prev) => ({ ...prev, [key]: fn(prev[key]) }));
  }

  function toggle(key: string) {
    patch(key, (d) => ({ ...d, done: !d.done }));
  }

  async function addPhotos(it: Item, files: FileList | null) {
    if (!files || !files.length) return;
    const list = Array.from(files);
    const compressed = await Promise.all(list.map((f) => compressImage(f)));
    const d = drafts[it.key];
    const room = Math.max(0, MAX_PHOTOS - (it.photos.length - d.removed.length) - d.added.length);
    const take = compressed.slice(0, room);
    setError(take.length < compressed.length ? `Máximo ${MAX_PHOTOS} fotos por punto` : null);
    if (!take.length) return;
    const added = take.map((file) => ({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, file, preview: URL.createObjectURL(file) }));
    // Hacer una foto del punto lo da por revisado.
    patch(it.key, (cur) => ({ ...cur, done: true, added: [...cur.added, ...added] }));
  }

  function removeSaved(key: string, path: string) {
    patch(key, (d) => ({ ...d, removed: [...d.removed, path] }));
  }

  function removePending(key: string, id: string) {
    patch(key, (d) => ({ ...d, added: d.added.filter((a) => a.id !== id) }));
  }

  async function post(fd: FormData) {
    const res = await fetch(`/api/profesional/servicio/${visitId}/checklist`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? "No se pudo guardar");
    return data as { item: { photos: string[] } };
  }

  async function guardar() {
    setSaving(true);
    setError(null);
    setOkMsg(false);
    try {
      // Una petición por foto (el servidor admite ~4 MB por petición), de una en una.
      for (const it of saved) {
        const d = drafts[it.key];
        if (!d) continue;
        if (d.done === it.done && !d.removed.length && !d.added.length) continue;

        for (const path of d.removed) {
          const fd = new FormData();
          fd.set("key", it.key);
          fd.set("remove", path);
          await post(fd);
        }
        for (const p of d.added) {
          const fd = new FormData();
          fd.set("key", it.key);
          fd.set("file", p.file);
          await post(fd);
        }
        const fd = new FormData();
        fd.set("key", it.key);
        fd.set("done", d.done ? "1" : "0");
        await post(fd);
      }
      setOkMsg(true);
      // Recarga la página con lo guardado de verdad (fotos con su enlace definitivo).
      window.location.reload();
    } catch (e: any) {
      setError(e.message ?? "No se pudo guardar. Compruebe la conexión.");
      setSaving(false);
    }
  }

  const doneCount = saved.filter((i) => drafts[i.key]?.done).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 96 }}>
      <p style={{ fontSize: 18 }}>
        <strong>{doneCount}</strong> de {saved.length} revisados
      </p>

      {saved.map((it) => {
        const d = drafts[it.key];
        const visibleSaved = it.photos.filter((p) => !d.removed.includes(p.path));
        const total = visibleSaved.length + d.added.length;
        return (
          <div key={it.key} className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, borderColor: d.done ? "var(--gold)" : "var(--line)" }}>
            <button
              type="button"
              onClick={() => toggle(it.key)}
              disabled={readOnly || saving}
              style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "none", border: "none", textAlign: "left", fontFamily: "inherit", fontSize: 18, cursor: "pointer", padding: 0 }}
            >
              <span
                aria-hidden
                style={{
                  flex: "0 0 34px",
                  height: 34,
                  borderRadius: 8,
                  border: "2px solid var(--gold)",
                  background: d.done ? "var(--gold)" : "#fff",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                {d.done ? "✓" : ""}
              </span>
              <span style={{ lineHeight: 1.4 }}>{it.label}</span>
            </button>

            {total > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {visibleSaved.map((p) => (
                  <Thumb key={p.path} src={p.url} onRemove={readOnly || saving ? undefined : () => removeSaved(it.key, p.path)} />
                ))}
                {d.added.map((p) => (
                  <Thumb key={p.id} src={p.preview} pending onRemove={saving ? undefined : () => removePending(it.key, p.id)} />
                ))}
              </div>
            )}

            {!readOnly && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <label className="pro-btn" style={{ minHeight: 56, width: "auto", fontSize: 17, padding: "10px 18px", cursor: "pointer" }}>
                  {total ? "Añadir otra foto" : "Hacer foto"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    hidden
                    disabled={saving || total >= MAX_PHOTOS}
                    onChange={(e) => {
                      addPhotos(it, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
                <label className="pro-btn quiet" style={{ minHeight: 56, width: "auto", fontSize: 17, padding: "10px 18px", cursor: "pointer" }}>
                  Elegir de la galería
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    disabled={saving || total >= MAX_PHOTOS}
                    onChange={(e) => {
                      addPhotos(it, e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        );
      })}

      {!saved.length && <p className="muted" style={{ fontSize: 18 }}>Este plan no tiene puntos de checklist.</p>}
      {error && <p className="error" style={{ fontSize: 16 }}>{error}</p>}

      {!readOnly && saved.length > 0 && (
        <div
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            padding: "12px max(16px, env(safe-area-inset-left, 0px)) calc(12px + env(safe-area-inset-bottom, 0px))",
            background: "var(--bg, #fff)",
            borderTop: "1px solid var(--line)",
            zIndex: 20,
          }}
        >
          <button type="button" className="pro-btn primary" onClick={guardar} disabled={saving || !dirty} style={{ width: "100%" }}>
            {saving ? "Guardando…" : dirty ? "Guardar" : okMsg ? "Guardado ✓" : "Sin cambios que guardar"}
          </button>
        </div>
      )}
    </div>
  );
}

function Thumb({ src, pending, onRemove }: { src: string; pending?: boolean; onRemove?: () => void }) {
  return (
    <div style={{ position: "relative" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 10, border: `2px ${pending ? "dashed" : "solid"} ${pending ? "var(--gold)" : "var(--line)"}` }}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Quitar foto"
          style={{ position: "absolute", top: -8, right: -8, width: 28, height: 28, borderRadius: 14, border: "none", background: "#c0392b", color: "#fff", fontSize: 16, lineHeight: "28px", cursor: "pointer", padding: 0 }}
        >
          ×
        </button>
      )}
    </div>
  );
}
