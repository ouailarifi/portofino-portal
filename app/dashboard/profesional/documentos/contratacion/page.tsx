import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import DocUpload from "../../_components/doc-upload";

// Documentos de contratación, tal como en el esquema: DNI, recibo RC, seguro RC,
// contratistas y subcontratistas, contrato y Seguridad Social.
const SLOTS: { title: string; types: string[]; upload: string; hint?: string }[] = [
  { title: "DNI", types: ["dni", "dni_anverso", "dni_reverso"], upload: "dni", hint: "Por las dos caras" },
  { title: "Recibo RC", types: ["rc_recibo"], upload: "rc_recibo", hint: "Recibo del pago de su seguro de responsabilidad civil" },
  { title: "Seguro RC", types: ["rc_poliza"], upload: "rc_poliza", hint: "Póliza de responsabilidad civil" },
  { title: "Contratistas y subcontratistas", types: ["certificado_contratistas"], upload: "certificado_contratistas" },
  { title: "Contrato", types: ["contrato_colaboracion"], upload: "contrato_colaboracion", hint: "Contrato de colaboración con Portofino" },
  { title: "Seguridad Social", types: ["seguridad_social"], upload: "seguridad_social", hint: "Estar al corriente de pago con la Seguridad Social" },
];

export default async function ContratacionPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: docs } = await supabase
    .from("professional_documents")
    .select("id, doc_type, label, storage_path")
    .eq("professional_id", user.id)
    .order("uploaded_at", { ascending: false });

  const service = createServiceClient();
  const withUrls = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await service.storage.from("professional-documents").createSignedUrl(d.storage_path, 3600);
      return { id: d.id, doc_type: d.doc_type, label: d.label ?? "Documento", url: data?.signedUrl ?? null };
    })
  );

  return (
    <div>
      <h1 className="pro-title">Contratación</h1>
      <p className="muted" style={{ fontSize: 16, marginBottom: 16 }}>Suba aquí sus documentos. Puede hacerles una foto con el móvil.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {SLOTS.map((s) => (
          <DocUpload
            key={s.title}
            docType={s.upload}
            title={s.title}
            hint={s.hint}
            docs={withUrls.filter((d) => s.types.includes(d.doc_type)).map(({ id, label, url }) => ({ id, label, url }))}
          />
        ))}
      </div>
    </div>
  );
}
