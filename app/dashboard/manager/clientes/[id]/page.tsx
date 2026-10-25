import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { computeCancellation, trialAndWithdrawalStatus } from "@/lib/cancellation";
import ClientDocumentsForm from "./client-documents-form";
import AddQuoteRequestForm from "./add-quote-request-form";
import AssignProfessionalSelect from "../../assign-professional-select";
import ScheduleVisitForm from "./schedule-visit-form";
import BonusForm from "./bonus-form";
import CancelPropertyButton from "./cancel-property-button";
import ActivateRecurringForm from "./activate-recurring-form";
import ResolvePlanRequestButtons from "./resolve-plan-request-buttons";
import MarkMessageReadButton from "./mark-message-read-button";
import PauseButton from "../../liquidaciones/pause-button";
import RefundButton from "../../liquidaciones/refund-button";
import ChargeClientForm from "../../liquidaciones/charge-client-form";
import ManagerPaymentMethods from "../../liquidaciones/manager-payment-methods";
import DeleteDocButton from "../../../documentacion/delete-doc-button";
import GenerateInvoiceForm from "./generate-invoice-form";
import { nextWeeks, weekLabel, toISODate } from "@/lib/calendar";

const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };
const DOCUMENT_TYPE_LABEL: Record<string, string> = { dni: "DNI", nie: "NIE", pasaporte: "Pasaporte" };
const GREMIO_LABEL: Record<string, string> = {
  carpinteria_madera: "Carpintería de madera",
  albanileria_reforma: "Albañilería / reforma",
  cristaleria: "Cristalería",
  carpinteria_metalica: "Carpintería metálica",
  reforma_general: "Reforma general",
};
const money = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n));

export default async function ClienteFichaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "manager") redirect("/dashboard");

  const { data: client } = await supabase.from("profiles").select("*").eq("id", params.id).single();
  if (!client) redirect("/dashboard/manager/clientes");

  const { data: properties } = await supabase
    .from("properties")
    .select("id, address, plan, billing_mode, monthly_fee, client_type, contract_start_date, payment_setup_completed, subscription_status, payment_paused")
    .eq("client_id", params.id);

  const propertyIds = (properties ?? []).map((p) => p.id);

  const [
    { data: visits },
    { data: quotes },
    { data: quoteRequests },
    { data: contracts },
    { data: payments },
    { data: docs },
    { data: planRequests },
    { data: messages },
  ] = await Promise.all([
    supabase.from("visits").select("id, property_id, status, scheduled_date").in("property_id", propertyIds.length ? propertyIds : ["-"]),
    supabase.from("quotes").select("id, property_id, status, amount_total").in("property_id", propertyIds.length ? propertyIds : ["-"]),
    supabase
      .from("quote_requests")
      .select("id, gremio, description, status, canal, created_at, property_id, assigned_professional_id")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("contracts").select("id, status, signature_name, signed_at, signed_storage_path, property_id").eq("client_id", params.id),
    supabase
      .from("payments")
      .select("id, property_id, concept, amount, currency, status, stripe_payment_intent_id")
      .in("property_id", propertyIds.length ? propertyIds : ["-"])
      .order("id", { ascending: false }),
    supabase.from("client_documents").select("id, doc_type, label, storage_path, uploaded_at, property_id").eq("client_id", params.id),
    supabase
      .from("plan_upgrade_requests")
      .select("id, property_id, current_plan, requested_plan, status, created_at")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_messages")
      .select("id, message, created_at, read_at, property_id")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
  ]);

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, series, number, concept, base_amount, iva_rate, total_amount, storage_path, sent_to, created_at")
    .eq("client_id", params.id)
    .order("created_at", { ascending: false });

  const { data: calendarEntries } = await supabase
    .from("property_calendar_entries")
    .select("property_id, entry_type, week_start")
    .in("property_id", propertyIds.length ? propertyIds : ["-"])
    .gte("week_start", toISODate(new Date()))
    .order("week_start", { ascending: true });

  const { data: professionals } = await supabase
    .from("profiles")
    .select("id, full_name, codigo_profesional")
    .eq("role", "profesional")
    .order("codigo_profesional", { ascending: true });

  const service = createServiceClient();
  const docsWithUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await service.storage.from("client-documents").createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl ?? null };
    })
  );

  const invoicesWithUrls = await Promise.all(
    (invoices ?? []).map(async (inv) => {
      const { data } = await service.storage.from("invoices").createSignedUrl(inv.storage_path, 3600);
      return { ...inv, url: data?.signedUrl ?? null };
    })
  );

  const contractsWithUrls = await Promise.all(
    (contracts ?? []).map(async (c) => {
      let url: string | null = null;
      if (c.signed_storage_path) {
        const { data } = await service.storage.from("contracts").createSignedUrl(c.signed_storage_path, 3600);
        url = data?.signedUrl ?? null;
      }
      return { ...c, url };
    })
  );

  const now = new Date();
  const visitasEsteMes = (visits ?? []).filter((v) => {
    if (!v.scheduled_date) return false;
    const d = new Date(v.scheduled_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
  const visitasEsteAnio = (visits ?? []).filter((v) => {
    if (!v.scheduled_date) return false;
    return new Date(v.scheduled_date).getFullYear() === now.getFullYear();
  }).length;

  const pendingPlanRequests = (planRequests ?? []).filter((r) => r.status === "pendiente");
  const bajasEnCurso = (properties ?? []).filter((p) => p.subscription_status === "baja_solicitada");
  const unreadMessages = (messages ?? []).filter((m) => !m.read_at);
  const notificacionesCount = pendingPlanRequests.length + bajasEnCurso.length + unreadMessages.length;

  const propertyAddress = (id: string | null) => properties?.find((p) => p.id === id)?.address ?? "General";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 30, marginBottom: 6 }}>{client.full_name}</h1>
        <p className="muted" style={{ fontSize: 14 }}>{client.email}</p>
      </div>

      <div className="card">
        <strong>Datos personales</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, fontSize: 14 }}>
          <div><span className="muted">{DOCUMENT_TYPE_LABEL[client.document_type ?? "dni"]}:</span> {client.dni ?? "—"}</div>
          <div><span className="muted">Teléfono:</span> {client.phone ?? "—"}</div>
          <div><span className="muted">Email 2:</span> {client.email_2 ?? "—"}</div>
          <div><span className="muted">Teléfono 2:</span> {client.phone_2 ?? "—"}</div>
          <div><span className="muted">Domicilio secundario:</span> {client.secondary_address ?? "—"}</div>
          <div><span className="muted">Persona de contacto:</span> {client.contact_name ?? "—"}</div>
          <div><span className="muted">Teléfono de contacto:</span> {client.contact_phone ?? "—"}</div>
        </div>
        {client.observaciones && (
          <p className="muted" style={{ fontSize: 14, marginTop: 10 }}>
            <strong>Observaciones:</strong> {client.observaciones}
          </p>
        )}
      </div>

      <div className="card">
        <strong>Resumen</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, marginBottom: 14, fontSize: 14 }}>
          <div><span className="muted">Visitas este mes:</span> {visitasEsteMes}</div>
          <div><span className="muted">Visitas este año:</span> {visitasEsteAnio}</div>
        </div>
        <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Bonificación</div>
        {client.bonus_note || client.bonus_amount != null ? (
          <p style={{ fontSize: 14, marginBottom: 10 }}>
            {client.bonus_note ?? "—"} {client.bonus_amount != null && <strong>({money(client.bonus_amount)})</strong>}
          </p>
        ) : (
          <p className="muted" style={{ fontSize: 14, marginBottom: 10 }}>Sin bonificaciones anotadas.</p>
        )}
        <BonusForm clientId={client.id} initialNote={client.bonus_note} initialAmount={client.bonus_amount} />
      </div>

      <div className="card">
        <strong>Notificaciones{notificacionesCount > 0 && ` (${notificacionesCount})`}</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {planRequests?.map((r) => (
            <div key={r.id} className="visit-row" style={{ alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: 14 }}>
                  Cambio de plan en {propertyAddress(r.property_id)}: <strong>{PLAN_LABEL[r.current_plan] ?? r.current_plan}</strong> → <strong>{PLAN_LABEL[r.requested_plan] ?? r.requested_plan}</strong>
                </span>
                <div className="muted" style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString("es-ES")} — {r.status}</div>
              </div>
              {r.status === "pendiente" && <ResolvePlanRequestButtons requestId={r.id} />}
            </div>
          ))}
          {bajasEnCurso.map((p) => (
            <div key={p.id} className="visit-row">
              <span style={{ fontSize: 14 }}>Baja solicitada — {p.address}</span>
              <span className="muted" style={{ fontSize: 12 }}>Ver bloque de Liquidaciones más abajo</span>
            </div>
          ))}
          {messages?.map((m) => (
            <div key={m.id} className="visit-row" style={{ alignItems: "flex-start" }}>
              <div>
                <p style={{ fontSize: 14 }}>{m.message}</p>
                <span className="muted" style={{ fontSize: 12 }}>
                  {propertyAddress(m.property_id)} — {new Date(m.created_at).toLocaleString("es-ES")} {!m.read_at && "· sin leer"}
                </span>
              </div>
              {!m.read_at && <MarkMessageReadButton messageId={m.id} />}
            </div>
          ))}
          {!planRequests?.length && !bajasEnCurso.length && !messages?.length && (
            <p className="muted" style={{ fontSize: 14 }}>Sin notificaciones.</p>
          )}
        </div>
      </div>

      {(properties ?? []).map((p) => {
        const propVisits = visits?.filter((v) => v.property_id === p.id) ?? [];
        const propQuotes = quotes?.filter((q) => q.property_id === p.id) ?? [];
        const propPayments = payments?.filter((pay) => pay.property_id === p.id) ?? [];
        const contract = contractsWithUrls.find((c) => c.property_id === p.id);

        const calc = computeCancellation({
          billingMode: p.billing_mode,
          contractStartDate: p.contract_start_date,
          monthlyFee: p.monthly_fee,
          clientType: p.client_type,
        });
        const estado = trialAndWithdrawalStatus(p.contract_start_date, p.billing_mode);

        let cuotasLlevadas: number | string;
        let cuotasFaltan: number | string;
        if (p.billing_mode === "annual") {
          cuotasLlevadas = Math.min(calc.elapsed ?? 0, 12);
          cuotasFaltan = calc.remainingMonths;
        } else {
          cuotasLlevadas = propPayments.filter((pay) => pay.concept === "Cuota mensual").length;
          cuotasFaltan = "sin permanencia";
        }

        return (
          <div key={p.id} className="card">
            <strong>{p.address}</strong>
            <div className="muted" style={{ fontSize: 13, marginBottom: 14 }}>
              Plan {PLAN_LABEL[p.plan] ?? p.plan} — {p.billing_mode === "annual" ? "Anual" : "Flexible"} — {p.client_type === "empresa" ? "Empresa" : "Particular"}
              {p.subscription_status === "baja_solicitada" && <span style={{ color: "var(--gold)" }}> — Baja solicitada</span>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 14, marginBottom: 14 }}>
              <div><span className="muted">Cuota mensual:</span> {money(p.monthly_fee)}</div>
              <div><span className="muted">Cuotas llevadas:</span> {cuotasLlevadas}</div>
              <div><span className="muted">Cuotas pendientes:</span> {cuotasFaltan}</div>
              <div><span className="muted">Alta de pago:</span> {p.payment_setup_completed ? "Completada" : "Pendiente"}</div>
              <div><span className="muted">Visitas:</span> {propVisits.length} ({propVisits.filter((v) => v.status === "hecha").length} hechas)</div>
              <div><span className="muted">Presupuestos:</span> {propQuotes.length}</div>
            </div>

            <div style={{ display: "flex", gap: 16, fontSize: 13, marginBottom: 14 }}>
              <span className={estado.enPeriodoPrueba ? "" : "muted"}>
                {estado.enPeriodoPrueba ? "✅ En periodo de prueba" : "Fuera del periodo de prueba"}
              </span>
              <span className={estado.desistimientoVigente ? "" : "muted"}>
                {estado.desistimientoVigente ? "✅ Desistimiento legal vigente (14 días)" : "Desistimiento legal ya vencido"}
              </span>
            </div>

            <div style={{ fontSize: 14, marginBottom: 14 }}>
              <span className="muted">Contrato: </span>
              {contract?.status === "firmado" ? (
                <>Firmado como "{contract.signature_name}" el {new Date(contract.signed_at!).toLocaleDateString("es-ES")}{contract.url && <> — <a href={contract.url} target="_blank" rel="noreferrer">descargar</a></>}</>
              ) : (
                "Pendiente de firma"
              )}
            </div>

            <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, marginBottom: 14 }}>
              <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>Liquidaciones de esta vivienda</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                {p.payment_setup_completed ? (
                  <>
                    <PauseButton propertyId={p.id} initialPaused={!!p.payment_paused} />
                    {p.subscription_status === "activa" && <CancelPropertyButton propertyId={p.id} />}
                  </>
                ) : (
                  <ActivateRecurringForm propertyId={p.id} />
                )}
              </div>
              {propPayments.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                  {propPayments.map((pay: any) => (
                    <div key={pay.id} className="visit-row" style={{ fontSize: 13 }}>
                      <span>{pay.concept} — {money(pay.amount)} ({pay.status})</span>
                      {pay.status === "cobrado" && pay.stripe_payment_intent_id && <RefundButton paymentId={pay.id} maxAmount={pay.amount} />}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(() => {
              const propEntries = calendarEntries?.filter((e) => e.property_id === p.id) ?? [];
              const ocupacion = propEntries.filter((e) => e.entry_type === "ocupacion").map((e) => e.week_start);
              const preferidas = propEntries.filter((e) => e.entry_type === "visita_preferida").map((e) => e.week_start);
              return (
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Semanas que el cliente estará en la vivienda:</div>
                  <div style={{ fontSize: 14, marginBottom: 10 }}>
                    {ocupacion.length ? ocupacion.map((w) => weekLabel(new Date(w))).join(", ") : "Ninguna marcada"}
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginBottom: 6 }}>Semanas preferidas para la visita:</div>
                  <div style={{ fontSize: 14, marginBottom: 14 }}>
                    {preferidas.length ? preferidas.map((w) => weekLabel(new Date(w))).join(", ") : "Ninguna marcada"}
                  </div>
                  <ScheduleVisitForm propertyId={p.id} />
                </div>
              );
            })()}
          </div>
        );
      })}
      {!properties?.length && <p className="muted">Este cliente todavía no tiene viviendas asociadas.</p>}

      <div className="card">
        <strong>Cobro manual a este cliente</strong>
        <div style={{ marginTop: 14 }}>
          <ChargeClientForm clients={[{ id: client.id, full_name: client.full_name }]} properties={(properties ?? []).map((p) => ({ id: p.id, address: p.address, client_id: client.id }))} />
        </div>
      </div>

      <div className="card">
        <strong>Facturación</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, marginBottom: 16 }}>
          {invoicesWithUrls.map((inv) => (
            <div key={inv.id} className="visit-row">
              <span>
                {inv.series}-{inv.number} — {inv.concept} — {money(inv.total_amount)} ({new Date(inv.created_at).toLocaleDateString("es-ES")})
              </span>
              {inv.url && <a href={inv.url} target="_blank" rel="noreferrer">Ver PDF</a>}
            </div>
          ))}
          {!invoicesWithUrls.length && <p className="muted" style={{ fontSize: 14 }}>Sin facturas generadas todavía. Los recibos de cobros automáticos aparecerán aquí también.</p>}
        </div>
        <GenerateInvoiceForm clientId={client.id} properties={(properties ?? []).map((p) => ({ id: p.id, address: p.address }))} />
      </div>

      <div className="card">
        <strong>Método de pago</strong>
        <div style={{ marginTop: 14 }}>
          <ManagerPaymentMethods clientId={client.id} />
        </div>
      </div>

      <div className="card">
        <strong>Solicitudes de presupuesto</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14, marginBottom: 16 }}>
          {quoteRequests?.map((r) => (
            <div key={r.id} style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}>
              <div style={{ fontSize: 13, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span><strong>{GREMIO_LABEL[r.gremio] ?? r.gremio}</strong> · {r.canal} · {new Date(r.created_at).toLocaleDateString("es-ES")} · {r.status}</span>
                <AssignProfessionalSelect type="quote_request" id={r.id} current={r.assigned_professional_id} professionals={professionals ?? []} />
              </div>
              <p style={{ fontSize: 14, marginTop: 4 }}>{r.description}</p>
            </div>
          ))}
          {!quoteRequests?.length && <p className="muted" style={{ fontSize: 14 }}>Sin solicitudes.</p>}
        </div>
        <AddQuoteRequestForm clientId={client.id} properties={properties ?? []} />
      </div>

      <div className="card">
        <strong>Documentación del cliente</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, marginBottom: 16 }}>
          {docsWithUrls.map((d) => (
            <div key={d.id} className="visit-row">
              <span>{d.label || d.doc_type}</span>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {d.url && <a href={d.url} target="_blank" rel="noreferrer">Ver</a>}
                <DeleteDocButton endpoint={`/api/client-documents/${d.id}`} />
              </div>
            </div>
          ))}
          {!docsWithUrls.length && <p className="muted" style={{ fontSize: 14 }}>Sin documentos todavía.</p>}
        </div>
        <ClientDocumentsForm clientId={client.id} properties={properties ?? []} />
      </div>
    </div>
  );
}
