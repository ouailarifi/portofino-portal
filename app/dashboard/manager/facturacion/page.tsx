import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExpenseForm from "./expense-form";
import DeleteExpenseButton from "./delete-expense-button";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
const MONTH_LABEL = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default async function FacturacionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "manager") redirect("/dashboard");

  const [{ data: invoices }, { data: expenses }] = await Promise.all([
    supabase.from("invoices").select("base_amount, client_id, professional_id, created_at"),
    supabase.from("expenses").select("*").order("month", { ascending: false }),
  ]);

  type Bucket = { bruta: number; pagosProfesionales: number; gastos: { id: string; concept: string; amount: number }[] };
  const tree: Record<number, Record<number, Bucket>> = {};

  function bucketFor(y: number, m: number): Bucket {
    tree[y] ??= {};
    tree[y][m] ??= { bruta: 0, pagosProfesionales: 0, gastos: [] };
    return tree[y][m];
  }

  for (const inv of invoices ?? []) {
    const d = new Date(inv.created_at);
    const b = bucketFor(d.getFullYear(), d.getMonth());
    if (inv.client_id) b.bruta += Number(inv.base_amount ?? 0);
    else if (inv.professional_id) b.pagosProfesionales += Number(inv.base_amount ?? 0);
  }

  for (const e of expenses ?? []) {
    const d = new Date(e.month);
    const b = bucketFor(d.getFullYear(), d.getMonth());
    b.gastos.push({ id: e.id, concept: e.concept, amount: Number(e.amount) });
  }

  const years = Object.keys(tree).map(Number).sort((a, b) => b - a);
  if (!years.length) years.push(new Date().getFullYear());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Facturación</h1>
        <p className="muted" style={{ fontSize: 14 }}>
          Facturación bruta (clientes), pagos a profesionales y gastos operativos, todo sin IVA — mes a mes. Para el detalle factura por
          factura con enlace al PDF, ve a{" "}
          <Link href="/dashboard/manager/liquidaciones/generales" style={{ textDecoration: "underline" }}>
            Liquidaciones generales
          </Link>
          .
        </p>
      </div>

      {years.map((year) => {
        const monthsWithData = Object.keys(tree[year] ?? {}).map(Number);
        const months = Array.from({ length: 12 }, (_, i) => i).filter((m) => year < years[0] ? monthsWithData.includes(m) : true).sort((a, b) => b - a);

        const yearTotals = months.reduce(
          (acc, m) => {
            const b = tree[year]?.[m] ?? { bruta: 0, pagosProfesionales: 0, gastos: [] };
            const gastosMes = b.gastos.reduce((s, g) => s + g.amount, 0);
            acc.bruta += b.bruta;
            acc.pagosProfesionales += b.pagosProfesionales;
            acc.gastos += gastosMes;
            return acc;
          },
          { bruta: 0, pagosProfesionales: 0, gastos: 0 }
        );
        const yearNeta = yearTotals.bruta - yearTotals.pagosProfesionales - yearTotals.gastos;

        return (
          <details key={year} className="card" open={year === years[0]}>
            <summary style={{ cursor: "pointer", fontSize: 20, fontWeight: 600 }}>
              {year}
              <span className="muted" style={{ fontSize: 14, fontWeight: 400, marginLeft: 12 }}>
                Bruta {money(yearTotals.bruta)} — Profesionales {money(yearTotals.pagosProfesionales)} — Gastos {money(yearTotals.gastos)} —{" "}
                <strong style={{ color: yearNeta >= 0 ? "var(--gold)" : "#b3261e" }}>Neta {money(yearNeta)}</strong>
              </span>
            </summary>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              {months.map((m) => {
                const b = tree[year]?.[m] ?? { bruta: 0, pagosProfesionales: 0, gastos: [] };
                const gastosMes = b.gastos.reduce((s, g) => s + g.amount, 0);
                const neta = b.bruta - b.pagosProfesionales - gastosMes;
                const monthDate = `${year}-${String(m + 1).padStart(2, "0")}-01`;

                return (
                  <div key={m} style={{ border: "1px solid var(--line)", borderRadius: 8, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      <strong style={{ fontSize: 15 }}>{MONTH_LABEL[m]}</strong>
                      <span className="muted" style={{ fontSize: 13 }}>
                        Bruta {money(b.bruta)} − Profesionales {money(b.pagosProfesionales)} − Gastos {money(gastosMes)} ={" "}
                        <strong style={{ color: neta >= 0 ? "var(--ink)" : "#b3261e" }}> Neta {money(neta)}</strong>
                      </span>
                    </div>

                    <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Gastos de {MONTH_LABEL[m].toLowerCase()}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                      {b.gastos.map((g) => (
                        <div key={g.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span>{g.concept}</span>
                          <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            {money(g.amount)}
                            <DeleteExpenseButton id={g.id} />
                          </span>
                        </div>
                      ))}
                      {!b.gastos.length && <p className="muted" style={{ fontSize: 13 }}>Sin gastos registrados.</p>}
                    </div>
                    <ExpenseForm monthDate={monthDate} />
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
