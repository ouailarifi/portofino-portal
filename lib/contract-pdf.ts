import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Genera el certificado de aceptación que se guarda cuando el cliente firma
// (click-wrap): no es una firma manuscrita, es la constancia de que aceptó
// el contrato tipo vigente en esa fecha, con sus datos y una marca de tiempo.
export async function generateSignatureCertificate(params: {
  clientName: string;
  clientEmail: string;
  propertyAddress: string;
  plan: string;
  signatureName: string;
  signedAt: Date;
}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const left = 56;
  const draw = (text: string, opts: { size?: number; f?: typeof font; gap?: number; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(text, { x: left, y, size: opts.size ?? 11, font: opts.f ?? font, color: opts.color ?? rgb(0.1, 0.1, 0.1) });
    y -= opts.gap ?? (opts.size ?? 11) + 10;
  };

  draw("Certificado de aceptación de contrato", { size: 18, f: bold, gap: 34 });
  draw("Portofino Private Property Management", { size: 11, color: rgb(0.45, 0.45, 0.45), gap: 30 });

  draw(`Cliente: ${params.clientName}`, { gap: 20 });
  draw(`Email: ${params.clientEmail}`, { gap: 20 });
  draw(`Vivienda: ${params.propertyAddress}`, { gap: 20 });
  draw(`Plan contratado: ${params.plan}`, { gap: 30 });

  draw(
    "El cliente declara haber leído y aceptado íntegramente las condiciones del contrato tipo",
    { gap: 16 }
  );
  draw("de Portofino Private Property Management vigente en la fecha indicada más abajo.", { gap: 30 });

  draw("Firma (aceptación electrónica):", { size: 10, color: rgb(0.45, 0.45, 0.45), gap: 18 });
  draw(params.signatureName, { size: 16, f: bold, gap: 26 });

  draw(
    `Fecha y hora: ${params.signedAt.toLocaleString("es-ES", { dateStyle: "long", timeStyle: "short" })}`,
    { size: 10, color: rgb(0.45, 0.45, 0.45) }
  );

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// Plantilla provisional del contrato tipo, generada a partir de los términos
// confirmados en esta conversación. Es un BORRADOR — debe sustituirse por el
// contrato real revisado legalmente antes de usarse con clientes reales
// (el manager puede subir el PDF definitivo desde la sección Documentación).
export async function generatePlaceholderTemplate() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 780;
  const left = 56;
  const maxWidth = 483;
  const draw = (text: string, opts: { size?: number; f?: typeof font; gap?: number; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(text, { x: left, y, size: opts.size ?? 10.5, font: opts.f ?? font, color: opts.color ?? rgb(0.1, 0.1, 0.1), maxWidth });
    y -= opts.gap ?? (opts.size ?? 10.5) + 8;
  };

  draw("CONTRATO TIPO — BORRADOR PROVISIONAL", { size: 16, f: bold, color: rgb(0.7, 0.2, 0.2), gap: 20 });
  draw(
    "Este documento es un borrador generado automáticamente a partir de las condiciones comerciales acordadas. Debe ser sustituido por la versión revisada por un abogado antes de firmarse con clientes reales.",
    { size: 9.5, color: rgb(0.55, 0.2, 0.2), gap: 26 }
  );

  draw("1. Objeto", { f: bold, gap: 16 });
  draw(
    "Portofino Private Property Management presta servicios de custodia y gestión de la vivienda del cliente (property management premium / house sitting y concierge), según el plan contratado.",
    { gap: 22 }
  );

  draw("2. Modalidades de facturación", { f: bold, gap: 16 });
  draw(
    "Flexible: sin permanencia, cuotas mensuales. Anual: compromiso de 12 meses con los 3 primeros meses a prueba, pago por adelantado del importe anual.",
    { gap: 22 }
  );

  draw("3. Permanencia y baja anticipada (modalidad Anual)", { f: bold, gap: 16 });
  draw(
    "Durante los 3 primeros meses el cliente puede darse de baja libremente, sin penalización. A partir del cuarto mes, en caso de resolución anticipada, el cliente tiene derecho al reembolso de la parte proporcional de las cuotas no devengadas, aplicando una deducción del 30% en concepto de costes de regularización administrativa y ajuste del compromiso anual.",
    { gap: 22 }
  );

  draw("4. Derecho de desistimiento legal", { f: bold, gap: 16 });
  draw(
    "De acuerdo con la normativa española de protección al consumidor, el cliente dispone de 14 días naturales desde la firma para desistir del contrato sin coste alguno. El periodo de prueba de 3 meses de la modalidad Anual cubre y supera este plazo legal.",
    { gap: 22 }
  );

  draw("5. Presupuestos de obra", { f: bold, gap: 16 });
  draw(
    "Cualquier obra o reforma solicitada por el cliente se presupuesta de forma independiente y requiere su aceptación expresa antes de iniciarse.",
    { gap: 30 }
  );

  draw("— Fin del borrador —", { size: 9, color: rgb(0.55, 0.55, 0.55) });

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
