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
    const { error } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
    });
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

export default function PaymentMethods() {
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/payment-methods");
    const data = await res.json();
    setMethods(data.methods ?? []);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function startAdd() {
    setError(null);
    const res = await fetch("/api/payment-methods", { method: "POST" });
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
    const res = await fetch(`/api/payment-methods/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) setError(data.error ?? "No se pudo eliminar");
    else refresh();
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <p className="muted" style={{ fontSize: 14 }}>La verificación de tarjetas aún no está configurada.</p>;
  }

  return (
    <div>
      {methods === null && <p className="muted">Cargando…</p>}

      {methods && methods.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
          {methods.map((m) => (
            <div key={m.id} className="visit-row">
              <span style={{ textTransform: "capitalize" }}>
                {m.brand} •••• {m.last4} — caduca {m.expMonth}/{m.expYear}
                {m.isDefault && (
                  <span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>
                    (principal)
                  </span>
                )}
              </span>
              <button
                onClick={() => handleDelete(m.id)}
                disabled={methods.length <= 1}
                title={methods.length <= 1 ? "Añada otro método antes de eliminar este" : undefined}
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: methods.length <= 1 ? "default" : "pointer", textDecoration: "underline", fontFamily: "inherit" }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {methods && methods.length === 0 && (
        <p className="muted" style={{ fontSize: 14, marginBottom: 16 }}>Todavía no tiene ningún método de pago verificado.</p>
      )}

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {!adding && (
        <button className="btn" onClick={startAdd}>
          Añadir método de pago
        </button>
      )}

      {adding && clientSecret && stripePromise && (
        <div className="card" style={{ marginTop: 16 }}>
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <AddCardForm
              onDone={() => {
                setAdding(false);
                setClientSecret(null);
                refresh();
              }}
            />
          </Elements>
        </div>
      )}
    </div>
  );
}
