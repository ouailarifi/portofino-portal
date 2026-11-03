import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";
import ClientBottomNav from "./client-bottom-nav";

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
  { href: "/dashboard/manager", label: "Inicio" },
  { href: "/dashboard/manager/profesionales", label: "Profesionales" },
  { href: "/dashboard/manager/clientes", label: "Clientes" },
  { href: "/dashboard/manager/planes", label: "Planes" },
  { href: "/dashboard/manager/facturacion", label: "Facturación" },
  { href: "/dashboard/manager/liquidaciones", label: "Liquidaciones" },
  { href: "/dashboard/manager/presupuestos", label: "Presupuestos" },
  { href: "/dashboard/documentacion", label: "Documentación" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role, status").eq("id", user.id).single()
    : { data: null };
  const NAV = profile?.role === "manager" ? MANAGER_NAV : profile?.role === "profesional" ? PROFESIONAL_NAV : CLIENT_NAV;

  if (profile && profile.role !== "manager" && profile.status !== "activo") {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
          <SignOutButton />
        </div>
        <div className="card" style={{ maxWidth: 480, margin: "60px auto", textAlign: "center" }}>
          <strong>Acceso {profile.status === "pausado" ? "pausado" : "desactivado"}</strong>
          <p className="muted" style={{ marginTop: 12 }}>
            Su cuenta está {profile.status === "pausado" ? "temporalmente pausada" : "dada de baja"}. Póngase en contacto con Portofino si cree que es un error.
          </p>
        </div>
      </div>
    );
  }

  const isClient = profile?.role !== "manager" && profile?.role !== "profesional";

  return (
    <div className={isClient ? "client-shell" : ""}>
      <div
        className={isClient ? "desktop-nav" : ""}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 12 }}
      >
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
      {isClient && (
        <div className="mobile-only" style={{ justifyContent: "flex-end", marginBottom: 16 }}>
          <SignOutButton />
        </div>
      )}
      {children}
      {isClient && <ClientBottomNav />}
    </div>
  );
}
