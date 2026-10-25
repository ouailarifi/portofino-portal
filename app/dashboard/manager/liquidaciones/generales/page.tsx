import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const MONTH_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

type InvoiceRow = {
  id: string;
  series: string;
  number: number;
  concept: string;
  base_amount: number;
  iva_amount: number;
  total_amount: number;
  storage_path: string;
  created_at: string;
  client_id: string | null;
  professional_id: string | null;
  client_name: string | null;
  professional_name: string | null;
  url: string | null;
};

export default async function LiquidacionesGeneralesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "manager") redirect("/dashboard");

  const { data: invoices } = await supabase
    .from("invoices")
    .select(
      "id, series, number, concept, base_amount, iva_amount, total_amount, storage_path, created_at, client_id, professional_id, client:client_id(full_name), professional:professional_id(full_name, codigo_profesional)"
    )
    .order("created_at", { ascending: false });

  const service = createServiceClient();
  const rows: InvoiceRow[] = await Promise.all(
    (invoices ?? []).map(async (inv: any) => {
      const { data } = await service.storage.from("invoices").createSignedUrl(inv.storage_path, 3600);
      return {
        id: inv.id,
        series: inv.series,
        number: inv.number,
        concept: inv.concept,
        base_amount: Number(inv.base_amount ?? 0),
        iva_amount: Number(inv.iva_amount ?? 0),
        total_amount: Number(inv.total_amount ?? 0),
        storage_path: inv.storage_path,
        created_at: inv.created_at,
        client_id: inv.client_id,
        professional_id: inv.professional_id,
        client_name: inv.client?.full_name ?? null,
        professional_name: inv.professional ? `${inv.professional.codigo_profesional ?? ""} ${inv.professional.full_name ?? ""}`.trim() : null,
        url: data?.signedUrl ?? null,
      };
    })
  );

  // Agrupar por año → mes
  type MonthBucket = { in: InvoiceRow[]; out: InvoiceRow[] };
  const tree: Record<number, Record<number, MonthBucket>> = {};
  for (const r of rows) {
    const d = new Date(r.created_at);
    const y = d.getFullYear();
    const m = d.getMonth();
    tree[y] ??= {};
    tree[y][m] ??= { in: [], out: [] };
    if (r.client_id) tree[y][m].in.push(r);
    else if (r.professional_id) tree[y][m].out.push(r);
  }

  const years = Object.keys(tree).map(Number).sort((a, b) => b - a);

  const sumBase = (list: InvoiceRow[]) => list.reduce((s, r) => s + r.base_amount, 0);
  const sumIva = (list: InvoiceRow[]) => list.reduce((s, r) => s + r.iva_amount, 0);
  const sumTotal = (list: InvoiceRow[]) => list.reduce((s, r) => s + r.total_amount, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 30 }}>Liquidaciones generales</h1>
        <Link href="/dashboard/manager/liquidaciones" className="muted" style={{ fontSize: 13 }}>
          ← Volver a Liquidaciones
        </Link>
      </div>

      <p className="muted" style={{ fontSize: 14 }}>
        Todo el dinero que entra (facturas y recibos a clientes) y que sale (autofacturas a profesionales), agrupado por año y mes, con el total sin IVA, el IVA y el total con IVA de cada periodo. Cada movimiento enlaza a su factura/recibo/autofactura en PDF.
      </p>

      {!years.length && <p className="muted">Todavía no hay ninguna factura, recibo o autofactura generada.</p>}

      {years.map((year) => {
        const months = Object.keys(tree[year]).map(Number).sort((a, b) => b - a);
        const yearIn = months.flatMap((m) => tree[year][m].in);
        const yearOut = months.flatMap((m) => tree[year][m].out);
        return (
          <details key={year} className="card" open={year === years[0]}>
            <summary style={{ cursor: "pointer", fontSize: 20, fontWeight: 600 }}>
              {year}
              <span className="muted" style={{ fontSize: 14, fontWeight: 400, marginLeft: 12 }}>
                Entradas: {money(sumTotal(yearIn))} (base {money(sumBase(yearIn))} + IVA {money(sumIva(yearIn))}) — Salidas: {money(sumTotal(yearOut))} (base {money(sumBase(yearOut))} + IVA {money(sumIva(yearOut))})
              </span>
            </summary>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
              {months.map((month) => {
                const bucket = tree[year][month];
                return (
                  <details key={month} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 12 }}>
                    <summary style={{ cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
                      {MONTH_LABEL[month]}
                      <span className="muted" style={{ fontSize: 13, fontWeight: 400, marginLeft: 10 }}>
                        Entradas: {money(sumTotal(bucket.in))} (sin IVA {money(sumBase(bucket.in))}, IVA {money(sumIva(bucket.in))}) — Salidas: {money(sumTotal(bucket.out))} (sin IVA {money(sumBase(bucket.out))}, IVA {money(sumIva(bucket.out))})
                      </span>
                    </summary>

                    <div style={{ marginTop: 12 }}>
                      <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Entradas (clientes)</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
                        {bucket.in.map((r) => (
                          <div key={r.id} className="visit-row" style={{ fontSize: 13 }}>
                            <span>
                              {r.series}-{r.number} — {r.client_name} — {r.concept} — sin IVA {money(r.base_amount)} + IVA {money(r.iva_amount)} = <strong>{money(r.total_amount)}</strong>
                            </span>
                            {r.url && <a href={r.url} target="_blank" rel="noreferrer">Ver PDF</a>}
                          </div>
                        ))}
                        {!bucket.in.length && <p className="muted" style={{ fontSize: 13 }}>Sin entradas este mes.</p>}
                      </div>

                      <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Salidas (profesionales)</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {bucket.out.map((r) => (
                          <div key={r.id} className="visit-row" style={{ fontSize: 13 }}>
                            <span>
                              {r.series}-{r.number} — {r.professional_name} — {r.concept} — sin IVA {money(r.base_amount)} + IVA {money(r.iva_amount)} = <strong>{money(r.total_amount)}</strong>
                            </span>
                            {r.url && <a href={r.url} target="_blank" rel="noreferrer">Ver PDF</a>}
                          </div>
                        ))}
                        {!bucket.out.length && <p className="muted" style={{ fontSize: 13 }}>Sin salidas este mes.</p>}
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
