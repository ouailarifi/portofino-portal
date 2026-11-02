"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteExpenseButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    await fetch("/api/manager/expenses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className="muted"
      style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, textDecoration: "underline", padding: 0 }}
    >
      Borrar
    </button>
  );
}
