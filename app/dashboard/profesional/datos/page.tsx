import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import DatosForm from "../_components/datos-form";
import DocUpload from "../_components/doc-upload";

export default async function DatosPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: docs }] = await Promise.all([
    supabase.from("profiles").select("phone, phone_2, email, fiscal_address").eq("id", user.id).single(),
    supabase
      .from("professional_documents")
      .select("id, label, storage_path")
      .eq("professional_id", user.id)
      .eq("doc_type", "certificado_bancario")
      .order("uploaded_at", { ascending: false }),
  ]);

  const service = createServiceClient();
  const bankDocs = await Promise.all(
    (docs ?? []).map(async (d) => {
      const { data } = await service.storage.from("professional-documents").createSignedUrl(d.storage_path, 3600);
      return { id: d.id, label: d.label ?? "Certificado", url: data?.signedUrl ?? null };
    })
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <div>
        <h1 className="pro-title">Datos</h1>
        <p className="muted" style={{ fontSize: 16, marginBottom: 20 }}>Compruebe que sus datos están al día.</p>
        <DatosForm
          phone={profile?.phone ?? ""}
          phone2={profile?.phone_2 ?? ""}
          email={profile?.email ?? user.email ?? ""}
          fiscalAddress={profile?.fiscal_address ?? ""}
        />
      </div>

      <div>
        <h2 style={{ fontSize: 22, marginBottom: 12 }}>Cuenta bancaria</h2>
        <DocUpload
          docType="certificado_bancario"
          title="Certificado de titularidad de la cuenta"
          hint="Documento del banco donde aparece su número de cuenta"
          docs={bankDocs}
        />
      </div>
    </div>
  );
}
