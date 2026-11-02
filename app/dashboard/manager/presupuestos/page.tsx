import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateQuoteForm from "./create-quote-form";
import AssignProfessionalSelect from "../assign-professional-select";

const GREMIO_LABEL: Record<string, string> = {
  carpinteria_madera: "Carpintería de madera",
  albanileria_reforma: "Albañilería / reforma",
  cristaleria: "Cristalería",
  carpinteria_metalica: "Carpintería metálica",
  reforma_general: "Reforma general",
};
const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const STATUS_LABEL: Record<string, string> = { pendiente: "Pendiente de respuesta del cliente", aceptado: "Aceptado", rechazado: "Rechazado" };

export default async function PresupuestosManagerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "manager") redirect("/dashboard");

  const [{ data: requests }, { data: quotes }, { data: properties }, { data: professionals }, { data: invoices }] = await Promise.all([
    supabase.from("quote_requests").select("*").order("created_at", { ascending: false }),
    supabase.from("quotes").select("*").order("created_at", { ascending: false }),
    supabase.from("properties").select("id, address, client_id, profiles:client_id(full_name)"),
    supabase.from("profiles").select("id, full_name, codigo_profesional").eq("role", "profesional").eq("status", "activo"),
    supabase.from("invoices").select("id, property_id").not("client_id", "is", null),
  ]);

  const propertyById = new Map((properties ?? []).map((p: any) => [p.id, p]));
  const pendingRequests = (requests ?? []).filter((r) => r.status === "pendiente");
  const invoicedPropertyIds = new Set((invoices ?? []).map((i) => i.property_id));

  return (
    <div>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>Presupuestos</h1>
      <p className="muted" style={{ marginBottom: 28 }}>Solicitudes de los clientes, presupuestos enviados y su respuesta.</p>

      <h2 style={{ fontSize: 20, marginBottom: 14 }}>Solicitudes pendientes de presupuestar</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36 }}>
        {pendingRequests.map((r) => {
          const prop = propertyById.get(r.property_id);
          return (
            <div key={r.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                <div>
                  <strong>{GREMIO_LABEL[r.gremio] ?? r.gremio}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {prop ? (
                      <Link href={`/dashboard/manager/clientes/${prop.client_id}`} style={{ textDecoration: "underline" }}>
                        {prop.profiles?.full_name ?? "Cliente"} — {prop.address}
                      </Link>
                    ) : (
                      "Sin vivienda asociada"
                    )}
                  </div>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString("es-ES")} · {r.canal}</span>
              </div>
              <p style={{ fontSize: 14, marginBottom: 12 }}>{r.description}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <span className="muted" style={{ fontSize: 12 }}>Profesional:</span>
                <AssignProfessionalSelect type="quote_request" id={r.id} current={r.assigned_professional_id} professionals={professionals ?? []} />
              </div>
              <CreateQuoteForm quoteRequestId={r.id} propertyId={r.property_id} defaultTitle={GREMIO_LABEL[r.gremio] ?? r.gremio} />
            </div>
          );
        })}
        {!pendingRequests.length && <p className="muted" style={{ fontSize: 14 }}>No hay solicitudes pendientes.</p>}
      </div>

      <h2 style={{ fontSize: 20, marginBottom: 14 }}>Presupuestos enviados</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {(quotes ?? []).map((q) => {
          const prop = propertyById.get(q.property_id);
          const needsInvoice = q.status === "aceptado" && !invoicedPropertyIds.has(q.property_id);
          return (
            <div key={q.id} className="visit-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <strong>{q.title}</strong>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {prop ? (
                      <Link href={`/dashboard/manager/clientes/${prop.client_id}`} style={{ textDecoration: "underline" }}>
                        {prop.profiles?.full_name ?? "Cliente"} — {prop.address}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>{money(Number(q.amount_total))}</div>
                  <div
                    className="muted"
                    style={{ fontSize: 12, color: q.status === "aceptado" ? "var(--gold)" : q.status === "rechazado" ? "#b3261e" : undefined }}
                  >
                    {STATUS_LABEL[q.status] ?? q.status}
                  </div>
                </div>
              </div>
              {q.status === "rechazado" && q.rejection_reason && (
                <p className="muted" style={{ fontSize: 13, borderLeft: "2px solid var(--line)", paddingLeft: 10 }}>
                  Motivo: {q.rejection_reason}
                </p>
              )}
              {needsInvoice && prop && (
                <Link
                  href={`/dashboard/manager/clientes/${prop.client_id}`}
                  className="muted"
                  style={{ fontSize: 12, textDecoration: "underline", alignSelf: "flex-start" }}
                >
                  Aceptado — generar factura desde la ficha del cliente →
                </Link>
              )}
            </div>
          );
        })}
        {!quotes?.length && <p className="muted" style={{ fontSize: 14 }}>Todavía no se ha enviado ningún presupuesto.</p>}
      </div>
    </div>
  );
}
