import Link from "next/link";

export default function DocumentosHome() {
  return (
    <div>
      <h1 className="pro-title">Documentos</h1>
      <div className="pro-menu" style={{ minHeight: "45vh" }}>
        <Link href="/dashboard/profesional/documentos/autofacturas" className="pro-btn">
          <span>
            Autofactura
            <small>Sus facturas por año y mes</small>
          </span>
          <span>→</span>
        </Link>
        <Link href="/dashboard/profesional/documentos/contratacion" className="pro-btn">
          <span>
            Contratación
            <small>DNI, seguros, Seguridad Social y contrato</small>
          </span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
