"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignContractForm({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/contracts/${contractId}/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureName: name }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo firmar");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
      <div className="field">
        <label>Nombre completo (firma)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Escriba su nombre y apellidos" required />
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 3 }} />
        He leído y acepto íntegramente las condiciones del contrato tipo descargado arriba.
      </label>
      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
      <button className="btn" disabled={busy || !accepted || !name.trim()}>
        {busy ? "Firmando…" : "Firmar contrato"}
      </button>
    </form>
  );
}
