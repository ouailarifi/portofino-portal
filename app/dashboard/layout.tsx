import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./sign-out-button";

const NAV = [
  { href: "/dashboard", label: "Mis viviendas" },
  { href: "/dashboard/plan", label: "Mi plan" },
  { href: "/dashboard/presupuestos", label: "Presupuestos" },
  { href: "/dashboard/pagos", label: "Cobros" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
