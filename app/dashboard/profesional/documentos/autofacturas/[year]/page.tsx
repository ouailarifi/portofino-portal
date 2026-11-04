import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

export default async function AutofacturasYear({ params }: { params: { year: string } }) {
  const year = Number(params.year);
  if (!Number.isInteger(year) || year < 2020 || year > 2100) notFound();

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, series, number, concept, total_amount, storage_path, created_at")
    .eq("professional_id", user.id)
    .gte("created_at", `${year}-01-01T00:00:00Z`)
    .lt("created_at", `${year + 1}-01-01T00:00:00Z`)
    .order("created_at", { ascending: false });

  const service = createServiceClient();
  const withUrls = await Promise.all(
    (invoices ?? []).map(async (inv) => {
      const { data } = await service.storage.from("invoices").createSignedUrl(inv.storage_path, 3600);
      return { ...inv, url: data?.signedUrl ?? null, month: new Date(inv.created_at).getUTCMonth() };
    })
  );

  return (
    <div>
      <h1 className="pro-title">Autofactura {year}</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
        {MESES.map((nombre, m) => {
          const list = withUrls.filter((i) => i.month === m);
          return (
            <div key={nombre} className="card" style={{ padding: 16, opacity: list.length ? 1 : 0.55 }}>
              <strong style={{ fontSize: 20 }}>{nombre}</strong>
              {!list.length && <div className="muted" style={{ fontSize: 15 }}>Sin autofacturas</div>}
              {list.map((inv) => (
                <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10, fontSize: 16, flexWrap: "wrap" }}>
                  <span>
                    {inv.series}-{inv.number} — {inv.concept}
                    <div className="muted" style={{ fontSize: 14 }}>{money(Number(inv.total_amount))}</div>
                  </span>
                  {inv.url && (
                    <a className="pro-btn" href={inv.url} target="_blank" rel="noreferrer" style={{ minHeight: 48, width: "auto", fontSize: 17, padding: "8px 18px" }}>
                      Ver PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
