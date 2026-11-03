"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function VisitArrivalButtons({ visitId, arrivedAt, departedAt }: { visitId: string; arrivedAt: string | null; departedAt: string | null }) {
  const router = useRouter();
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mark(field: "arrived_at" | "departed_at") {
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("visits").update({ [field]: new Date().toISOString() }).eq("id", visitId);
    setBusy(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  if (!arrivedAt) {
    return (
      <button onClick={() => mark("arrived_at")} disabled={busy} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--gold-bg)", cursor: "pointer", fontFamily: "inherit" }}>
        {busy ? "…" : "Marcar llegada (manual)"}
      </button>
    );
  }
  if (!departedAt) {
    return (
      <button onClick={() => mark("departed_at")} disabled={busy} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
        {busy ? "…" : "Marcar salida (manual)"}
      </button>
    );
  }
  return <span className="muted" style={{ fontSize: 12 }}>Visitada {new Date(arrivedAt).toLocaleTimeString("es-ES")}–{new Date(departedAt).toLocaleTimeString("es-ES")}</span>;
}
