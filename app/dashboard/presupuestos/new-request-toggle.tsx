"use client";

import { useState } from "react";
import QuoteRequestForm from "./quote-request-form";

export default function NewRequestToggle({ properties }: { properties: { id: string; address: string }[] }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button className="btn" onClick={() => setOpen(true)} style={{ width: "100%", justifyContent: "center", marginBottom: 24 }}>
        + Solicitar presupuesto
      </button>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <strong>Nueva solicitud</strong>
        <button onClick={() => setOpen(false)} className="muted" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13 }}>
          Cerrar
        </button>
      </div>
      <QuoteRequestForm properties={properties} onSent={() => setOpen(false)} />
    </div>
  );
}
