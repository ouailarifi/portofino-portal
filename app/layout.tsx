import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portofino · Área privada",
  description: "Su vivienda, sus visitas, su tranquilidad.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <header className="top">
          <div className="wrap">
            <span className="brand">PORTOFINO</span>
          </div>
        </header>
        <main className="wrap" style={{ paddingTop: 48, paddingBottom: 80 }}>
          {children}
        </main>
      </body>
    </html>
  );
}
