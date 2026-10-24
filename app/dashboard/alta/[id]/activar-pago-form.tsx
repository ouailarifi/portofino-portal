"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

type Info = { address: string; billingMode: string; monthlyFee: number | null; amount: number; alreadyDone: boolean };

function CardStep({ propertyId, amount, onSaved }: { propertyId: string; amount: number; onSaved: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !accepted) return;
    setBusy(true);
    setError(null);

    const { error: setupError } = await stripe.confirmSetup({ elements, redirect: "if_required" });
    if (setupError) {
      setBusy(false);
      setError(setupError.message ?? "No se pudo verificar la tarjeta");
      return;
    }

    const res = await fetch(`/api/properties/${propertyId}/activar-pago`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "La tarjeta se guardó pero el cobro falló. Puede reintentarlo.");
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, marginTop: 16, lineHeight: 1.5 }}>
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 3 }} />
        Entiendo que al guardar la tarjeta se me cobrará de inmediato <strong>{money(amount)}</strong>.
      </label>
      {error && <p className="error" style={{ marginTop: 12 }}>{error}</p>}
      <button className="btn" disabled={busy || !accepted} style={{ marginTop: 16 }}>
        {busy ? "Procesando…" : `Guardar tarjeta y pagar ${money(amount)}`}
      </button>
    </form>
  );
}

export default function ActivarPagoForm({ propertyId, alreadyDone }: { propertyId: string; alreadyDone: boolean }) {
  const [info, setInfo] = useState<Info | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [done, setDone] = useState(alreadyDone);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/properties/${propertyId}/activar-pago`)
      .then((r) => r.json())
      .then(setInfo);
  }, [propertyId]);

  async function startSetup() {
    setError(null);
    const res = await fetch("/api/payment-methods", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "No se pudo iniciar la verificación");
      return;
    }
    setClientSecret(data.clientSecret);
  }

  if (done) {
    return <p style={{ fontSize: 14, color: "var(--gold)" }}>Alta de pago completada. Ya puede usar el servicio con normalidad.</p>;
  }

  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    return <p className="muted" style={{ fontSize: 14 }}>La verificación de tarjetas aún no está configurada.</p>;
  }

  if (!info) return <p className="muted">Cargando…</p>;

  return (
    <div>
      <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
        Plan {info.billingMode === "annual" ? "Anual" : "Flexible"}
        {info.billingMode === "annual"
          ? " — se cobra el importe anual completo por adelantado."
          : " — se cobra un alta inicial fija; la cuota mensual se activará automáticamente a partir del mes que viene."}
        <br />
        Importe a cobrar ahora: <strong>{money(info.amount)}</strong>
      </p>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {!clientSecret && (
        <button className="btn" onClick={startSetup}>
          Añadir tarjeta
        </button>
      )}

      {clientSecret && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CardStep propertyId={propertyId} amount={info.amount} onSaved={() => setDone(true)} />
        </Elements>
      )}
    </div>
  );
}
