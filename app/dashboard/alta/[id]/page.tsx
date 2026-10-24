import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ActivarPagoForm from "./activar-pago-form";

export default async function AltaPagoPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: property } = await supabase
    .from("properties")
    .select("id, address, plan, billing_mode, monthly_fee, payment_setup_completed")
    .eq("id", params.id)
    .single();

  if (!property) redirect("/dashboard");

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>Alta de pago — {property.address}</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Para activar el servicio necesitamos verificar un método de pago. Se le cobrará el importe indicado en
        cuanto lo guarde.
      </p>
      <div className="card">
        <ActivarPagoForm propertyId={property.id} alreadyDone={property.payment_setup_completed} />
      </div>
    </div>
  );
}
