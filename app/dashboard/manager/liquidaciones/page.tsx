import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import ChargeClientForm from "./charge-client-form";
import RefundButton from "./refund-button";
import ProfessionalPaymentForm from "./professional-payment-form";
import MarkPaidButton from "./mark-paid-button";
import PauseButton from "./pause-button";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default async function LiquidacionesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "manager") redirect("/dashboard");

  const [{ data: clients }, { data: properties }, { data: professionals }, { data: payments }, { data: proPayments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "cliente").order("full_name", { ascending: true }),
    supabase.from("properties").select("id, address, client_id, stripe_subscription_id").order("address", { ascending: true }),
    supabase.from("profiles").select("id, full_name, codigo_profesional").eq("role", "profesional").order("codigo_profesional", { ascending: true }),
    supabase
      .from("payments")
      .select("id, concept, amount, status, currency, stripe_payment_intent_id, created_at, properties(address), profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("professional_payments")
      .select("id, concept, amount, status, created_at, profiles(full_name, codigo_profesional)")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const propertiesWithSub = (properties ?? []).filter((p) => p.stripe_subscription_id);

  const pauseStates = await Promise.all(
    propertiesWithSub.map(async (p) => {
      try {
        const sub = await stripe.subscriptions.retrieve(p.stripe_subscription_id as string);
        return { id: p.id, paused: !!sub.pause_collection };
      } catch {
        return { id: p.id, paused: false };
      }
    })
  );
  const pausedById = new Map(pauseStates.map((s) => [s.id, s.paused]));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <h1 style={{ fontSize: 30 }}>Liquidaciones</h1>

      <div className="card">
        <strong>Cobrar a un cliente</strong>
        <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 16 }}>
          Para el resto de un presupuesto (firma, final) u otro cobro puntual. Usa la tarjeta ya guardada del cliente.
        </p>
        <ChargeClientForm clients={clients ?? []} properties={properties ?? []} />
      </div>

      <div className="card">
        <strong>Historial de cobros</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {payments?.map((p: any) => (
            <div key={p.id} className="visit-row">
              <div>
                <strong>{p.concept}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {p.profiles?.full_name} — {p.properties?.address} — {new Date(p.created_at).toLocaleDateString("es-ES")}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: p.amount < 0 ? "#b3261e" : "inherit" }}>{money(p.amount)}</span>
                <span className="muted" style={{ fontSize: 12 }}>{p.status}</span>
                {p.status === "cobrado" && p.stripe_payment_intent_id && <RefundButton paymentId={p.id} maxAmount={p.amount} />}
              </div>
            </div>
          ))}
          {!payments?.length && <p className="muted">Sin cobros todavía.</p>}
        </div>
      </div>

      <div className="card">
        <strong>Pausar / reanudar cuotas recurrentes</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {propertiesWithSub.map((p) => (
            <div key={p.id} className="visit-row">
              <span>{p.address}</span>
              <PauseButton propertyId={p.id} initialPaused={pausedById.get(p.id) ?? false} />
            </div>
          ))}
          {!propertiesWithSub.length && <p className="muted">Ninguna vivienda tiene cuota recurrente activa.</p>}
        </div>
      </div>

      <div className="card">
        <strong>Pagos a profesionales</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, marginBottom: 16 }}>
          {proPayments?.map((p: any) => (
            <div key={p.id} className="visit-row">
              <div>
                <strong>{p.profiles?.codigo_profesional} — {p.profiles?.full_name}</strong>
                <div className="muted" style={{ fontSize: 13 }}>{p.concept} — {new Date(p.created_at).toLocaleDateString("es-ES")}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span>{money(p.amount)}</span>
                {p.status === "pendiente" ? <MarkPaidButton id={p.id} /> : <span className="muted" style={{ fontSize: 12 }}>Pagado</span>}
              </div>
            </div>
          ))}
          {!proPayments?.length && <p className="muted">Sin pagos registrados.</p>}
        </div>
        <ProfessionalPaymentForm professionals={professionals ?? []} />
      </div>
    </div>
  );
}
