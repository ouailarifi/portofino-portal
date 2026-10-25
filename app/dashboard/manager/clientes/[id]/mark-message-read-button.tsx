"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkMessageReadButton({ messageId }: { messageId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    await fetch(`/api/manager/client-messages/${messageId}/read`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button onClick={handleClick} disabled={busy} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
      {busy ? "…" : "Marcar leído"}
    </button>
  );
}
