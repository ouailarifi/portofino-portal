"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteDocButton({ endpoint }: { endpoint: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    if (!confirm("¿Eliminar este documento?")) return;
    setBusy(true);
    await fetch(endpoint, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", fontSize: 13 }}
    >
      {busy ? "…" : "Eliminar"}
    </button>
  );
}
