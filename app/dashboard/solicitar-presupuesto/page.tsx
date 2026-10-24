import { createClient } from "@/lib/supabase/server";
import QuoteRequestForm from "./quote-request-form";

export default async function SolicitarPresupuestoPage() {
  const supabase = createClient();
  const { data: properties } = await supabase.from("properties").select("id, address").order("created_at", { ascending: true });

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>Solicitar presupuesto</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Cuéntenos qué necesita y le llamaremos para darle un presupuesto.
      </p>
      <div className="card">
        <QuoteRequestForm properties={properties ?? []} />
      </div>
    </div>
  );
}
