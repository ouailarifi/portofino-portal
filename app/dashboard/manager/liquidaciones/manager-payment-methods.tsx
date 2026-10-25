"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

type Method = { id: string; brand?: string; last4?: string; expMonth?: number; expYear?: number; isDefault: boolean };

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

function AddCardForm({ onDone }: { onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error } = await stripe.confirmSetup({ elements, redirect: "if_required" });
    setBusy(false);
    if (error) setError(error.message ?? "No se pudo verificar la tarjeta");
    else onDone();
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      <button className="btn" disabled={busy} style={{ marginTop: 16 }}>
        {busy ? "Verificando…" : "Guardar tarjeta"}
      </button>
    </form>
  );
}

// Versión para que el manager añada/elimine la tarjeta de un cliente en su
// nombre (p. ej. en una visita presencial). Misma mecánica PCI-segura que la
// versión del propio cliente en Configuración: el número de tarjeta se
// tokeniza en el navegador vía Stripe Elements y nunca pasa por nuestro
// servidor. Regla: no se puede eliminar el único método de pago sin haber
// añadido antes uno nuevo válido.
export default function ManagerPaymentMethods({ clientId }: { clientId: string }) {
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/manager/payment-methods/${clientId}`);
    const data = await res.json();
    setMethods(data.methods ?? []);
  }

  useEffect(() => {
    refresh();
    setAdding(false);
    setClientSecret(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  async function startAdd() {
    setError(null);
    const res = await fetch(`/api/manager/payment-methods/${clientId}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo iniciar la verificación");
      return;
    }
    setClientSecret(data.clientSecret);
    setAdding(true);
  }

  async function handleDelete(id: string) {
    setError(null);
    const res = await fetch(`/api/manager/payment-methods/${clientId}/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "No se pudo eliminar");
    else refresh();
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <p className="muted" style={{ fontSize: 14 }}>La verificación de tarjetas aún no está configurada.</p>;
  }

  return (
    <div>
      {methods === null && <p className="muted" style={{ fontSize: 14 }}>Cargando…</p>}

      {methods && methods.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {methods.map((m) => (
            <div key={m.id} className="visit-row" style={{ fontSize: 13 }}>
              <span style={{ textTransform: "capitalize" }}>
                {m.brand} •••• {m.last4} — caduca {m.expMonth}/{m.expYear}
                {m.isDefault && <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>(principal)</span>}
              </span>
              <button
                onClick={() => handleDelete(m.id)}
                disabled={methods.length <= 1}
                title={methods.length <= 1 ? "Añada otro método antes de eliminar este" : undefined}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: methods.length <= 1 ? "default" : "pointer", textDecoration: "underline", fontFamily: "inherit", fontSize: 12 }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {methods && methods.length === 0 && (
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Este cliente todavía no tiene ningún método de pago verificado.</p>
      )}

      {error && <p className="error" style={{ fontSize: 13, marginBottom: 10 }}>{error}</p>}

      {!adding && (
        <button className="btn" onClick={startAdd} style={{ padding: "6px 14px", fontSize: 13 }}>
          Añadir método de pago
        </button>
      )}

      {adding && clientSecret && stripePromise && (
        <div className="card" style={{ marginTop: 14 }}>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <AddCardForm onDone={() => { setAdding(false); setClientSecret(null); refresh(); }} />
          </Elements>
        </div>
      )}
    </div>
  );
}
