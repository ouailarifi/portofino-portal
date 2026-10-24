"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GREMIOS = [
  { value: "carpinteria_madera", label: "Carpintería de madera" },
  { value: "albanileria_reforma", label: "Albañilería / reforma" },
  { value: "cristaleria", label: "Cristalería" },
  { value: "carpinteria_metalica", label: "Carpintería metálica" },
  { value: "reforma_general", label: "Reforma general" },
  { value: "otro", label: "Otro" },
];

export default function CreateProfessionalForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dni, setDni] = useState("");
  const [gremio, setGremio] = useState(GREMIOS[0].value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ codigo: string; tempPassword: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/manager/professionals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone, dni, gremio }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el profesional");
      return;
    }
    setCreated({ codigo: data.codigo, tempPassword: data.tempPassword });
    router.refresh();
  }

  if (created) {
    return (
      <div style={{ fontSize: 14 }}>
        <p style={{ color: "var(--gold)", marginBottom: 8 }}>Profesional {created.codigo} creado.</p>
        <p className="muted">
          Acceso: <strong>{email}</strong> — contraseña temporal: <strong>{created.tempPassword}</strong>
        </p>
        <button className="btn" style={{ marginTop: 14 }} onClick={() => { setCreated(null); setFullName(""); setEmail(""); setPhone(""); setDni(""); }}>
          Añadir otro
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field">
        <label>Nombre completo</label>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>
      <div className="field">
        <label>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="field">
        <label>Teléfono</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="field">
        <label>DNI</label>
        <input value={dni} onChange={(e) => setDni(e.target.value)} />
      </div>
      <div className="field">
        <label>Gremio</label>
        <select value={gremio} onChange={(e) => setGremio(e.target.value)}>
          {GREMIOS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </div>
      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Creando…" : "Crear profesional"}</button>
    </form>
  );
}
