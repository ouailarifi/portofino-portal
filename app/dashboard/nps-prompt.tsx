"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function NpsPrompt({ propertyId }: { propertyId: string | null }) {
  const supabase = createClient();
  const [dismissed, setDismissed] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function dismiss() {
    try {
      sessionStorage.setItem("portofino_nps_dismissed", "1");
    } catch {}
    setDismissed(true);
  }

  if (dismissed || sent) return null;
  try {
    if (sessionStorage.getItem("portofino_nps_dismissed") === "1") return null;
  } catch {}

  async function handleSubmit() {
    if (score == null) {
      setError("Elija una puntuación del 0 al 10");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("nps_responses").insert({
      property_id: propertyId,
      score,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <strong>¿Nos recomendaría a un amigo o familiar?</strong>
        <button onClick={dismiss} className="muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
          Ahora no
        </button>
      </div>
      <p className="muted" style={{ fontSize: 13, margin: "8px 0 14px" }}>0 = nada probable, 10 = con total seguridad</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            onClick={() => setScore(n)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: score === n ? "2px solid var(--gold)" : "1px solid var(--line)",
              background: score === n ? "var(--gold-bg)" : "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: 14,
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="¿Algo que quiera contarnos sobre esa puntuación? (opcional)"
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--line)", fontFamily: "inherit", fontSize: 14, marginBottom: 12 }}
      />
      <button className="btn" onClick={handleSubmit} disabled={busy}>
        {busy ? "Enviando…" : "Enviar"}
      </button>
      {error && <p className="error" style={{ marginTop: 10 }}>{error}</p>}
    </div>
  );
}
