"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarkPaidButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    setBusy(true);
    await fetch(`/api/manager/professional-payments/${id}/pay`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button onClick={handleClick} disabled={busy} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, border: "1px solid var(--line)", background: "none", cursor: "pointer", fontFamily: "inherit" }}>
      {busy ? "…" : "Marcar pagado"}
    </button>
  );
}
