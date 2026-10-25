import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import ProfessionalDocumentsForm from "./professional-documents-form";
import PayServiceButton from "./pay-service-button";

const money = (n: number | null) => (n == null ? "—" : new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n));

const GREMIO_LABEL: Record<string, string> = {
  carpinteria_madera: "Carpintería de madera",
  albanileria_reforma: "Albañilería / reforma",
  cristaleria: "Cristalería",
  carpinteria_metalica: "Carpintería metálica",
  reforma_general: "Reforma general",
};

export default async function ProfesionalFichaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "manager") redirect("/dashboard");

  const { data: pro } = await supabase.from("profiles").select("*").eq("id", params.id).single();
  if (!pro) redirect("/dashboard/manager/profesionales");

  const [{ data: docs }, { data: visits }, { data: quotes }, { data: requests }, { data: proPayments }] = await Promise.all([
    supabase.from("professional_documents").select("id, doc_type, label, storage_path").eq("professional_id", params.id),
    supabase.from("visits").select("id, scheduled_date, status, service_number, properties(address)").eq("professional_id", params.id),
    supabase.from("quotes").select("id, title, status, amount_total, service_number, properties(address)").eq("assigned_professional_id", params.id),
    supabase.from("quote_requests").select("id, gremio, status, properties(address)").eq("assigned_professional_id", params.id),
    supabase
      .from("professional_payments")
      .select("id, concept, amount, status, paid_at, visit_id, quote_id")
      .eq("professional_id", params.id),
  ]);

  const paymentForVisit = (visitId: string) => proPayments?.find((p) => p.visit_id === visitId && p.status === "pagado");
  const paymentForQuote = (quoteId: string) => proPayments?.find((p) => p.quote_id === quoteId && p.status === "pagado");

  const thisYear = new Date().getFullYear();
  const totalFacturadoAnio = (proPayments ?? [])
    .filter((p) => p.status === "pagado" && p.paid_at && new Date(p.paid_at).getFullYear() === thisYear)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const service = createServiceClient();
  const docsWithUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await service.storage.from("professional-documents").createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl ?? null };
    })
  );

  const DOC_LABEL: Record<string, string> = {
    rc_poliza: "Póliza de RC",
    rc_recibo: "Recibo de RC",
    dni: "DNI",
    dni_anverso: "DNI (anverso)",
    dni_reverso: "DNI (reverso)",
    contrato_colaboracion: "Contrato de colaboración firmado",
    certificado_contratistas: "Certificado de contratistas y subcontratistas",
    certificado_bancario: "Certificado de cuenta bancaria",
    foto: "Foto",
    otro: "Otro",
  };

  const DOCUMENT_TYPE_LABEL: Record<string, string> = { dni: "DNI", nie: "NIE", pasaporte: "Pasaporte" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 30, marginBottom: 6 }}>{pro.codigo_profesional} — {pro.full_name}</h1>
        <p className="muted" style={{ fontSize: 14 }}>
          {GREMIO_LABEL[pro.gremio ?? ""] ?? pro.gremio ?? "Sin gremio"} — {pro.email} — {pro.phone ?? "sin teléfono"} — {DOCUMENT_TYPE_LABEL[pro.document_type ?? "dni"]} {pro.dni ?? "—"}
        </p>
        {pro.fiscal_address && <p className="muted" style={{ fontSize: 14 }}>Domicilio fiscal: {pro.fiscal_address}</p>}
        {pro.observaciones && (
          <p className="muted" style={{ fontSize: 14, marginTop: 6 }}>
            <strong>Observaciones:</strong> {pro.observaciones}
          </p>
        )}
      </div>

      <div className="card">
        <strong>Documentación</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14, marginBottom: 16 }}>
          {docsWithUrls.map((d) => (
            <div key={d.id} className="visit-row">
              <span>{DOC_LABEL[d.doc_type] ?? d.doc_type} — {d.label}</span>
              {d.url && <a href={d.url} target="_blank" rel="noreferrer">Ver</a>}
            </div>
          ))}
          {!docsWithUrls.length && <p className="muted" style={{ fontSize: 14 }}>Sin documentos todavía.</p>}
        </div>
        <ProfessionalDocumentsForm professionalId={pro.id} />
      </div>

      <div className="card">
        <strong>Total facturado con nosotros en {thisYear}</strong>
        <p style={{ fontSize: 24, marginTop: 10 }}>{money(totalFacturadoAnio)}</p>
        <p className="muted" style={{ fontSize: 13 }}>Suma de visitas y presupuestos ya pagados este año.</p>
      </div>

      <div className="card">
        <strong>Visitas asignadas</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {visits?.map((v: any) => {
            const payment = paymentForVisit(v.id);
            return (
              <div key={v.id} className="visit-row">
                <div>
                  <span>{v.properties?.address}</span>
                  {v.service_number && <div className="muted" style={{ fontSize: 12 }}>{v.service_number}</div>}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="muted">{v.scheduled_date ?? "sin fecha"} — {v.status}</span>
                  {payment ? (
                    <span style={{ fontSize: 12, color: "var(--gold)" }}>Pagada ({money(payment.amount)})</span>
                  ) : (
                    <PayServiceButton professionalId={pro.id} visitId={v.id} defaultConcept={`Visita — ${v.properties?.address ?? ""}`} />
                  )}
                </div>
              </div>
            );
          })}
          {!visits?.length && <p className="muted" style={{ fontSize: 14 }}>Sin visitas asignadas.</p>}
        </div>
      </div>

      <div className="card">
        <strong>Presupuestos y solicitudes asignados</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 14 }}>
          {quotes?.map((q: any) => {
            const payment = paymentForQuote(q.id);
            return (
              <div key={q.id} className="visit-row">
                <div>
                  <span>{q.properties?.address} — {q.title}</span>
                  {q.service_number && <div className="muted" style={{ fontSize: 12 }}>{q.service_number}</div>}
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span className="muted">{q.status}</span>
                  {q.status === "aceptado" && (
                    payment ? (
                      <span style={{ fontSize: 12, color: "var(--gold)" }}>Pagado ({money(payment.amount)})</span>
                    ) : (
                      <PayServiceButton professionalId={pro.id} quoteId={q.id} defaultConcept={`Presupuesto — ${q.title}`} />
                    )
                  )}
                </div>
              </div>
            );
          })}
          {requests?.map((r: any) => (
            <div key={r.id} className="visit-row">
              <span>{r.properties?.address ?? "Sin vivienda"} — {GREMIO_LABEL[r.gremio] ?? r.gremio}</span>
              <span className="muted">{r.status}</span>
            </div>
          ))}
          {!quotes?.length && !requests?.length && <p className="muted" style={{ fontSize: 14 }}>Sin asignaciones.</p>}
        </div>
      </div>
    </div>
  );
}
