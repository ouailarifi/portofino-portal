import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

const CLIENT_NAV = [
  { href: "/dashboard", label: "Mis viviendas" },
  { href: "/dashboard/plan", label: "Mi plan" },
  { href: "/dashboard/solicitar-presupuesto", label: "Solicitar presupuesto" },
  { href: "/dashboard/calendario", label: "Calendario" },
  { href: "/dashboard/presupuestos", label: "Presupuestos" },
  { href: "/dashboard/pagos", label: "Cobros" },
  { href: "/dashboard/documentacion", label: "Documentación" },
  { href: "/dashboard/mensajes", label: "Mensajes" },
  { href: "/dashboard/configuracion", label: "Configuración" },
];

const PROFESIONAL_NAV = [{ href: "/dashboard", label: "Mis visitas" }];

const MANAGER_NAV = [
  { href: "/dashboard/manager/clientes", label: "Clientes" },
  { href: "/dashboard/manager/profesionales", label: "Profesionales" },
  { href: "/dashboard/manager/liquidaciones", label: "Liquidaciones" },
  { href: "/dashboard/documentacion", label: "Documentación" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user ? await supabase.from("profiles").select("role").eq("id", user.id).single() : { data: null };
  const NAV = profile?.role === "manager" ? MANAGER_NAV : profile?.role === "profesional" ? PROFESIONAL_NAV : CLIENT_NAV;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}>
        <nav style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="muted" style={{ fontSize: 14, textDecoration: "none" }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="muted" style={{ marginRight: 16, fontSize: 14 }}>
            {user?.email}
          </span>
          <SignOutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
