"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const TABS = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: (
      <path d="M3 11.5 12 4l9 7.5M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    href: "/dashboard/calendario",
    label: "Visitas",
    icon: (
      <>
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/dashboard/presupuestos",
    label: "Presupuestos",
    icon: (
      <>
        <path d="M6 3.5h9l3 3V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8.5 10h7M8.5 13.5h7M8.5 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </>
    ),
  },
  {
    href: "/dashboard/pagos",
    label: "Pagos",
    icon: (
      <>
        <rect x="2.5" y="6" width="19" height="13" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M2.5 10h19" stroke="currentColor" strokeWidth="1.6" />
      </>
    ),
  },
];

const MORE_LINKS = [
  { href: "/dashboard/plan", label: "Mi plan" },
  { href: "/dashboard/solicitar-presupuesto", label: "Solicitar presupuesto" },
  { href: "/dashboard/documentacion", label: "Documentación" },
  { href: "/dashboard/mensajes", label: "Mensajes" },
  { href: "/dashboard/configuracion", label: "Configuración" },
];

export default function ClientBottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href));
  const moreActive = MORE_LINKS.some((l) => pathname?.startsWith(l.href));

  return (
    <>
      <nav className="bottom-nav">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={isActive(t.href) ? "active" : ""}>
            <svg viewBox="0 0 24 24">{t.icon}</svg>
            {t.label}
          </Link>
        ))}
        <button onClick={() => setOpen(true)} className={moreActive ? "active" : ""}>
          <svg viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.6" fill="currentColor" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
            <circle cx="19" cy="12" r="1.6" fill="currentColor" />
          </svg>
          Más
        </button>
      </nav>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(14,29,64,0.55)", zIndex: 50, display: "flex", alignItems: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{
              width: "100%",
              borderRadius: "20px 20px 0 0",
              paddingBottom: "calc(28px + env(safe-area-inset-bottom, 0px))",
              maxHeight: "70vh",
              overflowY: "auto",
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 4, background: "var(--line)", margin: "0 auto 18px" }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {MORE_LINKS.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="visit-row" style={{ border: "none", padding: "16px 4px" }}>
                  <span style={{ fontSize: 16 }}>{l.label}</span>
                  <span className="muted">→</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
