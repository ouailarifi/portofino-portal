import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import SignContractForm from "./sign-contract-form";
import UploadTemplateForm from "./upload-template-form";

const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };
const TEMPLATE_PATH = "plantilla/contrato-tipo.pdf";

async function templateUrl(service: ReturnType<typeof createServiceClient>) {
  const { data } = await service.storage.from("contracts").createSignedUrl(TEMPLATE_PATH, 3600);
  return data?.signedUrl ?? null;
}

export default async function DocumentacionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const isManager = profile?.role === "manager";
  const service = createServiceClient();
  const template = await templateUrl(service);

  if (isManager) {
    const { data: contracts } = await supabase
      .from("contracts")
      .select("id, status, signature_name, signed_at, signed_storage_path, properties(address), profiles(email)")
      .order("created_at", { ascending: false });

    const withUrls = await Promise.all(
      (contracts ?? []).map(async (c: any) => {
        let signedUrl: string | null = null;
        if (c.signed_storage_path) {
          const { data } = await service.storage.from("contracts").createSignedUrl(c.signed_storage_path, 3600);
          signedUrl = data?.signedUrl ?? null;
        }
        return { ...c, signedUrl };
      })
    );

    return (
      <div>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>Documentación — vista manager</h1>
        <p className="muted" style={{ marginBottom: 16 }}>Acceso completo a la plantilla y a todos los contratos firmados por los clientes.</p>

        <div className="card" style={{ marginBottom: 24 }}>
          <strong>Plantilla de contrato tipo</strong>
          <div style={{ marginTop: 10, marginBottom: 14 }}>
            {template ? <a href={template} target="_blank" rel="noreferrer">Ver plantilla actual</a> : <span className="muted">Sin plantilla</span>}
          </div>
          <UploadTemplateForm />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {withUrls.map((c) => (
            <div key={c.id} className="visit-row">
              <div>
                <strong>{c.properties?.address}</strong>
                <div className="muted" style={{ fontSize: 13 }}>
                  {c.profiles?.email} — {c.status === "firmado" ? `Firmado como "${c.signature_name}" el ${new Date(c.signed_at).toLocaleDateString("es-ES")}` : "Pendiente de firma"}
                </div>
              </div>
              {c.signedUrl && <a href={c.signedUrl} target="_blank" rel="noreferrer">Descargar</a>}
            </div>
          ))}
          {!withUrls.length && <p className="muted">Todavía no hay contratos.</p>}
        </div>
      </div>
    );
  }

  // Cliente: aseguramos que exista un contrato por cada vivienda suya.
  const { data: properties } = await supabase.from("properties").select("id, address, plan").order("created_at", { ascending: true });

  for (const p of properties ?? []) {
    const { data: existing } = await supabase.from("contracts").select("id").eq("property_id", p.id).eq("client_id", user.id).maybeSingle();
    if (!existing) {
      await supabase.from("contracts").insert({ property_id: p.id, client_id: user.id });
    }
  }

  const { data: contracts } = await supabase
    .from("contracts")
    .select("id, status, signature_name, signed_at, signed_storage_path, property_id")
    .eq("client_id", user.id);

  const rows = await Promise.all(
    (properties ?? []).map(async (p) => {
      const contract = contracts?.find((c) => c.property_id === p.id);
      let signedUrl: string | null = null;
      if (contract?.signed_storage_path) {
        const { data } = await service.storage.from("contracts").createSignedUrl(contract.signed_storage_path, 3600);
        signedUrl = data?.signedUrl ?? null;
      }
      return { property: p, contract, signedUrl };
    })
  );

  return (
    <div style={{ maxWidth: 680 }}>
      <h1 style={{ fontSize: 30, marginBottom: 8 }}>Documentación</h1>
      <p className="muted" style={{ marginBottom: 24 }}>Consulte el contrato tipo y firme electrónicamente.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map(({ property: p, contract, signedUrl }) => (
          <div key={p.id} className="card">
            <strong>{p.address}</strong>
            <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Plan {PLAN_LABEL[p.plan] ?? p.plan}</div>

            <div style={{ display: "flex", gap: 16, fontSize: 14, marginBottom: 8 }}>
              {template && <a href={template} target="_blank" rel="noreferrer">Ver contrato tipo</a>}
              {signedUrl && <a href={signedUrl} target="_blank" rel="noreferrer">Descargar mi certificado firmado</a>}
            </div>

            {contract?.status === "firmado" ? (
              <p style={{ fontSize: 14, color: "var(--gold)" }}>
                Firmado como "{contract.signature_name}" el {new Date(contract.signed_at!).toLocaleDateString("es-ES")}.
              </p>
            ) : (
              contract && <SignContractForm contractId={contract.id} />
            )}
          </div>
        ))}
        {!properties?.length && <p className="muted">Todavía no hay ninguna vivienda asociada a su cuenta.</p>}
      </div>
    </div>
  );
}
