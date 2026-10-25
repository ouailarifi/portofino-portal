import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import SignContractForm from "./sign-contract-form";
import UploadTemplateForm from "./upload-template-form";
import ManagerDocumentsForm from "./manager-documents-form";
import DocPersonSelector from "./doc-person-selector";
import DeleteDocButton from "./delete-doc-button";
import ClientDocumentsForm from "../manager/clientes/[id]/client-documents-form";
import ProfessionalDocumentsForm from "../manager/profesionales/[id]/professional-documents-form";

const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };
const TEMPLATE_PATH = "plantilla/contrato-tipo.pdf";

const MANAGER_DOC_LABEL: Record<string, string> = {
  contrato_generico: "Contrato tipo genérico",
  rc_propio: "Nuestro seguro de RC",
  recibo_rc_propio: "Nuestro recibo de RC",
  otro: "Otro",
};
const CLIENT_DOC_LABEL: Record<string, string> = { dni: "DNI", escrituras: "Escrituras de la vivienda", otro: "Otro" };
const PRO_DOC_LABEL: Record<string, string> = {
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

async function templateUrl(service: ReturnType<typeof createServiceClient>) {
  const { data } = await service.storage.from("contracts").createSignedUrl(TEMPLATE_PATH, 3600);
  return data?.signedUrl ?? null;
}

export default async function DocumentacionPage({ searchParams }: { searchParams: { vista?: string; personaId?: string } }) {
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
    const vista = searchParams.vista === "manager" || searchParams.vista === "clientes" || searchParams.vista === "profesionales" ? searchParams.vista : "contratos";

    const TABS = [
      { key: "contratos", label: "Contratos" },
      { key: "manager", label: "Nuestra documentación" },
      { key: "clientes", label: "Clientes" },
      { key: "profesionales", label: "Profesionales" },
    ];

    return (
      <div>
        <h1 style={{ fontSize: 30, marginBottom: 8 }}>Documentación</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Selecciona qué documentación quieres ver: la nuestra, la de un cliente o la de un profesional.
        </p>

        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/dashboard/documentacion?vista=${t.key}`}
              style={{
                fontSize: 14,
                textDecoration: "none",
                color: vista === t.key ? "var(--gold)" : "var(--muted)",
                borderBottom: vista === t.key ? "2px solid var(--gold)" : "2px solid transparent",
                paddingBottom: 6,
              }}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {vista === "contratos" && <ContratosTab supabase={supabase} service={service} template={template} />}
        {vista === "manager" && <ManagerDocsTab supabase={supabase} service={service} />}
        {vista === "clientes" && <ClientesDocsTab supabase={supabase} service={service} personaId={searchParams.personaId} />}
        {vista === "profesionales" && <ProfesionalesDocsTab supabase={supabase} service={service} personaId={searchParams.personaId} />}
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

async function ContratosTab({ supabase, service, template }: { supabase: any; service: any; template: string | null }) {
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
    <>
      <div className="card" style={{ marginBottom: 24 }}>
        <strong>Plantilla de contrato tipo</strong>
        <div style={{ marginTop: 10, marginBottom: 14 }}>
          {template ? <a href={template} target="_blank" rel="noreferrer">Ver plantilla actual</a> : <span className="muted">Sin plantilla</span>}
        </div>
        <UploadTemplateForm />
      </div>

      <div className="card">
        <strong>Contratos firmados por los clientes</strong>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {withUrls.map((c: any) => (
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
    </>
  );
}

async function ManagerDocsTab({ supabase, service }: { supabase: any; service: any }) {
  const { data: docs } = await supabase.from("manager_documents").select("id, doc_type, label, storage_path, uploaded_at").order("uploaded_at", { ascending: false });
  const withUrls = await Promise.all(
    (docs ?? []).map(async (d: any) => {
      const { data } = await service.storage.from("manager-documents").createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="card">
      <strong>Nuestra documentación</strong>
      <p className="muted" style={{ fontSize: 13, marginTop: 4, marginBottom: 14 }}>
        Contrato tipo genérico, nuestro seguro de RC, el recibo de haberlo pagado, y otros documentos de la empresa.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, marginBottom: 16 }}>
        {withUrls.map((d: any) => (
          <div key={d.id} className="visit-row">
            <span>{MANAGER_DOC_LABEL[d.doc_type] ?? d.doc_type} — {d.label}</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {d.url && <a href={d.url} target="_blank" rel="noreferrer">Ver</a>}
              <DeleteDocButton endpoint={`/api/manager-documents/${d.id}`} />
            </div>
          </div>
        ))}
        {!withUrls.length && <p className="muted" style={{ fontSize: 14 }}>Sin documentos todavía.</p>}
      </div>
      <ManagerDocumentsForm />
    </div>
  );
}

async function ClientesDocsTab({ supabase, service, personaId }: { supabase: any; service: any; personaId?: string }) {
  const { data: clients } = await supabase.from("profiles").select("id, full_name").eq("role", "cliente").order("full_name", { ascending: true });

  if (!clients?.length) return <p className="muted">Todavía no hay ningún cliente dado de alta.</p>;

  const selectedId = personaId && clients.some((c: any) => c.id === personaId) ? personaId : clients[0].id;
  const selectedClient = clients.find((c: any) => c.id === selectedId);

  const [{ data: docs }, { data: properties }] = await Promise.all([
    supabase.from("client_documents").select("id, doc_type, label, storage_path, property_id").eq("client_id", selectedId),
    supabase.from("properties").select("id, address").eq("client_id", selectedId),
  ]);

  const withUrls = await Promise.all(
    (docs ?? []).map(async (d: any) => {
      const { data } = await service.storage.from("client-documents").createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="card">
      <strong>Documentación de clientes</strong>
      <div style={{ marginTop: 14, marginBottom: 20 }}>
        <DocPersonSelector
          people={clients.map((c: any) => ({ id: c.id, label: c.full_name }))}
          basePath="/dashboard/documentacion?vista=clientes"
          selectedId={selectedId}
        />
      </div>
      <p style={{ fontSize: 14, marginBottom: 14 }}>
        <strong>{selectedClient?.full_name}</strong> —{" "}
        <Link href={`/dashboard/manager/clientes/${selectedId}`} className="muted" style={{ fontSize: 13 }}>
          Ver ficha completa →
        </Link>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {withUrls.map((d: any) => (
          <div key={d.id} className="visit-row">
            <span>{CLIENT_DOC_LABEL[d.doc_type] ?? d.doc_type} — {d.label}</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {d.url && <a href={d.url} target="_blank" rel="noreferrer">Ver</a>}
              <DeleteDocButton endpoint={`/api/client-documents/${d.id}`} />
            </div>
          </div>
        ))}
        {!withUrls.length && <p className="muted" style={{ fontSize: 14 }}>Sin documentos todavía.</p>}
      </div>
      <ClientDocumentsForm clientId={selectedId} properties={properties ?? []} />
    </div>
  );
}

async function ProfesionalesDocsTab({ supabase, service, personaId }: { supabase: any; service: any; personaId?: string }) {
  const { data: professionals } = await supabase
    .from("profiles")
    .select("id, full_name, codigo_profesional")
    .eq("role", "profesional")
    .order("codigo_profesional", { ascending: true });

  if (!professionals?.length) return <p className="muted">Todavía no hay ningún profesional dado de alta.</p>;

  const selectedId = personaId && professionals.some((p: any) => p.id === personaId) ? personaId : professionals[0].id;
  const selectedPro = professionals.find((p: any) => p.id === selectedId);

  const { data: docs } = await supabase.from("professional_documents").select("id, doc_type, label, storage_path").eq("professional_id", selectedId);

  const withUrls = await Promise.all(
    (docs ?? []).map(async (d: any) => {
      const { data } = await service.storage.from("professional-documents").createSignedUrl(d.storage_path, 3600);
      return { ...d, url: data?.signedUrl ?? null };
    })
  );

  return (
    <div className="card">
      <strong>Documentación de profesionales</strong>
      <div style={{ marginTop: 14, marginBottom: 20 }}>
        <DocPersonSelector
          people={professionals.map((p: any) => ({ id: p.id, label: `${p.codigo_profesional} — ${p.full_name}` }))}
          basePath="/dashboard/documentacion?vista=profesionales"
          selectedId={selectedId}
        />
      </div>
      <p style={{ fontSize: 14, marginBottom: 14 }}>
        <strong>{selectedPro?.codigo_profesional} — {selectedPro?.full_name}</strong> —{" "}
        <Link href={`/dashboard/manager/profesionales/${selectedId}`} className="muted" style={{ fontSize: 13 }}>
          Ver ficha completa →
        </Link>
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {withUrls.map((d: any) => (
          <div key={d.id} className="visit-row">
            <span>{PRO_DOC_LABEL[d.doc_type] ?? d.doc_type} — {d.label}</span>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {d.url && <a href={d.url} target="_blank" rel="noreferrer">Ver</a>}
              <DeleteDocButton endpoint={`/api/professional-documents/${d.id}`} />
            </div>
          </div>
        ))}
        {!withUrls.length && <p className="muted" style={{ fontSize: 14 }}>Sin documentos todavía.</p>}
      </div>
      <ProfessionalDocumentsForm professionalId={selectedId} />
    </div>
  );
}
