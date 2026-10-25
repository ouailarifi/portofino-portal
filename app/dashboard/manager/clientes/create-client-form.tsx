"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const DOCUMENT_TYPES = [
  { value: "dni", label: "DNI" },
  { value: "nie", label: "NIE" },
  { value: "pasaporte", label: "Pasaporte" },
];

export default function CreateClientForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [email2, setEmail2] = useState("");
  const [phone, setPhone] = useState("");
  const [phone2, setPhone2] = useState("");
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0].value);
  const [dni, setDni] = useState("");
  const [secondaryAddress, setSecondaryAddress] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ tempPassword: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/manager/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, email2, phone, phone2, documentType, dni, secondaryAddress, observaciones }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "No se pudo crear el cliente");
      return;
    }
    setCreated({ tempPassword: data.tempPassword });
    router.refresh();
  }

  if (created) {
    return (
      <div style={{ fontSize: 14 }}>
        <p style={{ color: "var(--gold)", marginBottom: 8 }}>Cliente {fullName} creado.</p>
        <p className="muted">
          Acceso: <strong>{email}</strong> — contraseña temporal: <strong>{created.tempPassword}</strong>
        </p>
        <p className="muted" style={{ marginTop: 6 }}>
          Ahora puedes darle de alta su vivienda (domicilio contratado) y hacer firmar el contrato de colaboración desde su ficha.
        </p>
        <button
          className="btn"
          style={{ marginTop: 14 }}
          onClick={() => {
            setCreated(null);
            setFullName("");
            setEmail("");
            setEmail2("");
            setPhone("");
            setPhone2("");
            setDni("");
            setSecondaryAddress("");
            setObservaciones("");
          }}
        >
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
        <label>Email 2 (opcional)</label>
        <input type="email" value={email2} onChange={(e) => setEmail2(e.target.value)} />
      </div>
      <div className="field">
        <label>Teléfono (España)</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="field">
        <label>Teléfono 2 (opcional)</label>
        <input value={phone2} onChange={(e) => setPhone2(e.target.value)} />
      </div>
      <div className="field">
        <label>Tipo de documento</label>
        <select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
          {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Número de documento</label>
        <input value={dni} onChange={(e) => setDni(e.target.value)} />
      </div>
      <div className="field">
        <label>Domicilio secundario (opcional)</label>
        <input value={secondaryAddress} onChange={(e) => setSecondaryAddress(e.target.value)} />
      </div>
      <div className="field">
        <label>Observaciones</label>
        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} />
      </div>
      <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
        El domicilio contratado (vivienda) se añade después desde la ficha del cliente, y el contrato de colaboración se firma desde Documentación.
      </p>
      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}
      <button className="btn" disabled={busy}>{busy ? "Creando…" : "Crear cliente"}</button>
    </form>
  );
}
