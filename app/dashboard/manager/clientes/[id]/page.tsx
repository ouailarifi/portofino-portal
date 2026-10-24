import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { computeCancellation, trialAndWithdrawalStatus } from "@/lib/cancellation";
import ClientDocumentsForm from "./client-documents-form";
import AddQuoteRequestForm from "./add-quote-request-form";
import AssignProfessionalSelect from "../../assign-professional-select";
import ScheduleVisitForm from "./schedule-visit-form";
import { nextWeeks, weekLabel, toISODate } from "@/lib/calendar";

const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };
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
    .select("id, address, plan, billing_mode, monthly_fee, client_type, contract_start_date, payment_setup_completed, subscription_status")
    .eq("client_id", params.id);

  const propertyIds = (properties ?? []).map((p) => p.id);

  const [{ data: visits }, { data: quotes }, { data: quoteRequests }, { data: contracts }, { data: payments }, { data: docs }] = await Promise.all([
    supabase.from("visits").select("id, property_id, status").in("property_id", propertyIds.length ? propertyIds : ["-"]),
    supabase.from("quotes").select("id, property_id, status, amount_total").in("property_id", propertyIds.length ? propertyIds : ["-"]),
    supabase
      .from("quote_requests")
      .select("id, gremio, description, status, canal, created_at, property_id, assigned_professional_id")
      .eq("client_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("contracts").select("id, status, signature_name, signed_at, signed_storage_path, property_id").eq("client_id", params.id),
    supabase.from("payments").select("property_id, concept, amount, status").in("property_id", propertyIds.length ? propertyIds : ["-"]),
    supabase.from("client_documents").select("id, doc_type, label, storage_path, uploaded_at, property_id").eq("client_id", params.id),
  ]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 30, marginBottom: 6 }}>{client.full_name}</h1>
        <p className="muted" style={{ fontSize: 14 }}>{client.email}</p>
      </div>

      <div className="card">
        <strong>Datos personales</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12, fontSize: 14 }}>
          <div><span className="muted">DNI:</span> {client.dni ?? "—"}</div>
          <div><span className="muted">Teléfono:</span> {client.phone ?? "—"}</div>
          <div><span className="muted">Persona de contacto:</span> {client.contact_name ?? "—"}</div>
          <div><span className="muted">Teléfono de contacto:</span> {client.contact_phone ?? "—"}</div>
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
              {d.url && <a href={d.url} target="_blank" rel="noreferrer">Ver</a>}
            </div>
          ))}
          {!docsWithUrls.length && <p className="muted" style={{ fontSize: 14 }}>Sin documentos todavía.</p>}
        </div>
        <ClientDocumentsForm clientId={client.id} properties={properties ?? []} />
      </div>
    </div>
  );
}
