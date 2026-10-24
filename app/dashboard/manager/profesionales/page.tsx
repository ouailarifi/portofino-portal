import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CreateProfessionalForm from "./create-professional-form";

const GREMIO_LABEL: Record<string, string> = {
  carpinteria_madera: "Carpintería de madera",
  albanileria_reforma: "Albañilería / reforma",
  cristaleria: "Cristalería",
  carpinteria_metalica: "Carpintería metálica",
  reforma_general: "Reforma general",
};

export default async function ManagerProfesionalesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "manager") redirect("/dashboard");

  const { data: professionals } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, gremio, codigo_profesional")
    .eq("role", "profesional")
    .order("codigo_profesional", { ascending: true });

  return (
    <div>
      <h1 style={{ fontSize: 30, marginBottom: 24 }}>Profesionales</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {professionals?.map((p) => (
          <Link key={p.id} href={`/dashboard/manager/profesionales/${p.id}`} className="visit-row">
            <div>
              <strong>{p.codigo_profesional} — {p.full_name}</strong>
              <div className="muted" style={{ fontSize: 13 }}>
                {GREMIO_LABEL[p.gremio ?? ""] ?? p.gremio ?? "Sin gremio"} — {p.email}
              </div>
            </div>
            <span className="muted">Ver ficha →</span>
          </Link>
        ))}
        {!professionals?.length && <p className="muted">Todavía no hay profesionales.</p>}
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        <strong>Dar de alta un profesional</strong>
        <div style={{ marginTop: 14 }}>
          <CreateProfessionalForm />
        </div>
      </div>
    </div>
  );
}
