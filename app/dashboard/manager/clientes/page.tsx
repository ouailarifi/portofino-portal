import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateClientForm from "./create-client-form";

export default async function ManagerClientesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") redirect("/dashboard");

  const { data: clients } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, properties(id, address, plan)")
    .eq("role", "cliente")
    .order("full_name", { ascending: true });

  return (
    <div>
      <h1 style={{ fontSize: 30, marginBottom: 24 }}>Clientes</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {clients?.map((c: any) => (
          <Link key={c.id} href={`/dashboard/manager/clientes/${c.id}`} className="visit-row">
            <div>
              <strong>{c.full_name}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {c.email} {c.phone ? `— ${c.phone}` : ""}
              </div>
            </div>
            <span className="muted">{c.properties?.length ?? 0} vivienda(s) →</span>
          </Link>
        ))}
        {!clients?.length && <p className="muted">Todavía no hay clientes.</p>}
      </div>

      <div className="card" style={{ maxWidth: 560, marginTop: 28 }}>
        <strong>Dar de alta un cliente</strong>
        <div style={{ marginTop: 14 }}>
          <CreateClientForm />
        </div>
      </div>
    </div>
  );
}
