"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewRescheduleButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function review() {
    setBusy(true);
    await fetch(`/api/manager/reschedules/${id}/review`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={review}
      disabled={busy}
      style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid var(--line)", background: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}
    >
      {busy ? "…" : "Marcar revisado"}
    </button>
  );
}
