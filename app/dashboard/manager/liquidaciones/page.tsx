import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeCancellation } from "@/lib/cancellation";
import ChargeClientForm from "./charge-client-form";
import RefundButton from "./refund-button";
import ProfessionalPaymentForm from "./professional-payment-form";
import MarkPaidButton from "./mark-paid-button";
import PauseButton from "./pause-button";
import PersonSelector from "./person-selector";
import ManagerPaymentMethods from "./manager-payment-methods";
import CancelPropertyButton from "../clientes/[id]/cancel-property-button";
import ActivateRecurringForm from "../clientes/[id]/activate-recurring-form";
import PayServiceButton from "../profesionales/[id]/pay-service-button";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };

export default async function LiquidacionesPage({ searchParams }: { searchParams: { tipo?: string; id?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "manager") redirect("/dashboard");

  const [{ data: clients }, { data: properties }, { data: professionals }, { data: payments }, { data: proPayments }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("role", "cliente").order("full_name", { ascending: true }),
    supabase
      .from("properties")
      .select("id, address, client_id, stripe_subscription_id, payment_paused, profiles(full_name)")
      .order("address", { ascending: true }),
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

  const tipo = searchParams.tipo === "profesional" ? "profesional" : searchParams.tipo === "cliente" ? "cliente" : undefined;
  const selectedId = searchParams.id;

  let selectedClient: any = null;
  let selectedClientProperties: any[] = [];
  let selectedProfessional: any = null;
  let selectedServices: any[] = [];

  if (tipo === "cliente" && selectedId) {
    const { data: c } = await supabase.from("profiles").select("id, full_name, email").eq("id", selectedId).single();
    selectedClient = c;
    const { data: props } = await supabase
      .from("properties")
      .select("id, address, plan, billing_mode, monthly_fee, client_type, contract_start_date, payment_setup_completed, subscription_status, payment_paused")
      .eq("client_id", selectedId);
    selectedClientProperties = props ?? [];
  }

  if (tipo === "profesional" && selectedId) {
    const { data: p } = await supabase.from("profiles").select("id, full_name, codigo_profesional").eq("id", selectedId).single();
    selectedProfessional = p;
    const [{ data: visits }, { data: quotes }, { data: proPay }] = await Promise.all([
      supabase.from("visits").select("id, scheduled_date, status, service_number, properties(address)").eq("professional_id", selectedId),
      supabase.from("quotes").select("id, title, status, service_number, properties(address)").eq("assigned_professional_id", selectedId).eq("status", "aceptado"),
      supabase.from("professional_payments").select("visit_id, quote_id, status").eq("professional_id", selectedId).eq("status", "pagado"),
    ]);
    const paidVisitIds = new Set((proPay ?? []).filter((p) => p.visit_id).map((p) => p.visit_id));
    const paidQuoteIds = new Set((proPay ?? []).filter((p) => p.quote_id).map((p) => p.quote_id));
    selectedServices = [
      ...(visits ?? []).filter((v) => !paidVisitIds.has(v.id)).map((v: any) => ({ kind: "visit", id: v.id, label: `Visita — ${v.properties?.address ?? ""}`, service_number: v.service_number })),
      ...(quotes ?? []).filter((q) => !paidQuoteIds.has(q.id)).map((q: any) => ({ kind: "quote", id: q.id, label: `Presupuesto — ${q.properties?.address ?? ""} — ${q.title}`, service_number: q.service_number })),
    ];
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <h1 style={{ fontSize: 30 }}>Liquidaciones</h1>

      <div className="card">
        <strong>Selecciona un cliente o un profesional</strong>
        <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 16 }}>
          Elige a quién quieres cobrar, pagar, retener (pausar) o cancelar.
        </p>
        <PersonSelector
          clients={(clients ?? []).map((c) => ({ id: c.id, label: c.full_name }))}
          professionals={(professionals ?? []).map((p) => ({ id: p.id, label: `${p.codigo_profesional} — ${p.full_name}` }))}
          selectedTipo={tipo}
          selectedId={selectedId}
        />
      </div>

      {tipo === "cliente" && selectedClient && (
        <div className="card">
          <strong>{selectedClient.full_name}</strong>
          <Link href={`/dashboard/manager/clientes/${selectedClient.id}`} className="muted" style={{ fontSize: 13, display: "block", marginTop: 2, marginBottom: 16 }}>
            Ver ficha completa →
          </Link>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
            {selectedClientProperties.map((p) => {
              const calc = computeCancellation({
                billingMode: p.billing_mode,
                contractStartDate: p.contract_start_date,
                monthlyFee: p.monthly_fee,
                clientType: p.client_type,
              });
              return (
                <div key={p.id} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 14, marginBottom: 8 }}>
                    <strong>{p.address}</strong> — {PLAN_LABEL[p.plan] ?? p.plan} — {money(p.monthly_fee)}
                    {p.subscription_status === "baja_solicitada" && <span style={{ color: "var(--gold)" }}> — Baja solicitada</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {p.payment_setup_completed ? (
                      <>
                        <PauseButton propertyId={p.id} initialPaused={!!p.payment_paused} />
                        {p.subscription_status === "activa" && <CancelPropertyButton propertyId={p.id} />}
                      </>
                    ) : (
                      <ActivateRecurringForm propertyId={p.id} />
                    )}
                  </div>
                  {calc.insideCommitment && calc.penaltyAmount > 0 && (
                    <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                      Penalización estimada si se da de baja ahora: {money(calc.penaltyAmount)}
                    </p>
                  )}
                </div>
              );
            })}
            {!selectedClientProperties.length && <p className="muted" style={{ fontSize: 14 }}>Este cliente no tiene ninguna vivienda dada de alta.</p>}
          </div>

          <div style={{ marginBottom: 20 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Cobrar a este cliente</div>
            <ChargeClientForm
              clients={[{ id: selectedClient.id, full_name: selectedClient.full_name }]}
              properties={selectedClientProperties.map((p) => ({ id: p.id, address: p.address, client_id: selectedClient.id }))}
            />
          </div>

          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Método de pago</div>
            <ManagerPaymentMethods clientId={selectedClient.id} />
          </div>
        </div>
      )}

      {tipo === "profesional" && selectedProfessional && (
        <div className="card">
          <strong>{selectedProfessional.codigo_profesional} — {selectedProfessional.full_name}</strong>
          <Link href={`/dashboard/manager/profesionales/${selectedProfessional.id}`} className="muted" style={{ fontSize: 13, display: "block", marginTop: 2, marginBottom: 16 }}>
            Ver ficha completa →
          </Link>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Servicios pendientes de pago</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selectedServices.map((s) => (
              <div key={`${s.kind}-${s.id}`} className="visit-row">
                <div>
                  <span>{s.label}</span>
                  {s.service_number && <div className="muted" style={{ fontSize: 12 }}>{s.service_number}</div>}
                </div>
                <PayServiceButton
                  professionalId={selectedProfessional.id}
                  visitId={s.kind === "visit" ? s.id : undefined}
                  quoteId={s.kind === "quote" ? s.id : undefined}
                  defaultConcept={s.label}
                />
              </div>
            ))}
            {!selectedServices.length && <p className="muted" style={{ fontSize: 14 }}>Sin servicios pendientes de pago.</p>}
          </div>
        </div>
      )}

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
          {propertiesWithSub.map((p: any) => (
            <div key={p.id} className="visit-row">
              <div>
                <strong>{p.address}</strong>
                <div className="muted" style={{ fontSize: 13 }}>{p.profiles?.full_name}</div>
              </div>
              <PauseButton propertyId={p.id} initialPaused={!!p.payment_paused} />
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
