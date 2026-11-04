"use client";

import { usePathname, useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();
  const pathname = usePathname();

  // En la pantalla de Inicio no hay "atrás" dentro de la app: dejamos el
  // espacio reservado (mismo tamaño) para que el botón de cerrar sesión
  // no cambie de sitio al navegar entre pantallas.
  if (pathname === "/dashboard" || pathname === "/dashboard/profesional") return <span style={{ width: 36, height: 36, display: "inline-block" }} />;

  return (
    <button onClick={() => router.back()} className="back-arrow" aria-label="Volver">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
