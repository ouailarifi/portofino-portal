import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AutofacturasYears() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: invoices } = await supabase.from("invoices").select("created_at").eq("professional_id", user.id);

  const thisYear = new Date().getFullYear();
  const years = new Set<number>([thisYear]);
  for (const inv of invoices ?? []) years.add(new Date(inv.created_at).getFullYear());
  const sorted = Array.from(years).sort((a, b) => b - a);

  return (
    <div>
      <h1 className="pro-title">Autofactura</h1>
      <p className="muted" style={{ fontSize: 16, marginBottom: 16 }}>Elija el año.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {sorted.map((y) => {
          const n = (invoices ?? []).filter((i) => new Date(i.created_at).getFullYear() === y).length;
          return (
            <Link key={y} href={`/dashboard/profesional/documentos/autofacturas/${y}`} className="pro-btn">
              <span>
                {y}
                <small>{n ? `${n} autofactura${n === 1 ? "" : "s"}` : "Sin autofacturas"}</small>
              </span>
              <span>→</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
