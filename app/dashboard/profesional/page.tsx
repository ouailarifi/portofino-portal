import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "../sign-out-button";

// Pantalla de inicio del profesional: cuatro botones grandes en el centro.
export default async function ProfesionalHome() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { count: pendientes }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    supabase.from("visits").select("id", { count: "exact", head: true }).eq("professional_id", user.id).eq("status", "programada"),
  ]);

  const nombre = profile?.full_name?.split(" ")[0];

  return (
    <div>
      <h1 className="pro-title">Hola{nombre ? `, ${nombre}` : ""}</h1>
      <p className="muted" style={{ fontSize: 18 }}>¿Qué quiere hacer?</p>

      <div className="pro-menu">
        <Link href="/dashboard/profesional/servicios" className="pro-btn primary">
          <span>
            Servicios
            <small>{pendientes ? `${pendientes} pendiente${pendientes === 1 ? "" : "s"}` : "Ninguno pendiente"}</small>
          </span>
          <span>→</span>
        </Link>
        <Link href="/dashboard/profesional/documentos" className="pro-btn">
          <span>Documentos</span>
          <span>→</span>
        </Link>
        <Link href="/dashboard/profesional/datos" className="pro-btn">
          <span>Datos</span>
          <span>→</span>
        </Link>
        <SignOutButton big />
      </div>
    </div>
  );
}
