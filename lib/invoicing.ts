import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createServiceClient } from "@/lib/supabase/service";

const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);

function issuer() {
  return {
    name: process.env.ISSUER_NAME ?? "Portofino Private Property Management",
    nif: process.env.ISSUER_NIF ?? "",
    address: process.env.ISSUER_ADDRESS ?? "",
  };
}

async function sendEmailWithAttachment(to: string, subject: string, text: string, pdf: Buffer, filename: string) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "Portofino <notificaciones@portofino.com>",
        to,
        subject,
        text,
        attachments: [{ filename, content: pdf.toString("base64") }],
      }),
    });
  } catch {
    // Un fallo en el envío no debe romper el registro ya guardado del documento.
  }
}

type DocKind = "factura" | "autofactura" | "recibo";

type InvoiceLine = { concept: string; serviceNumber?: string | null };

async function buildPdf(params: {
  title: string;
  number: string;
  date: Date;
  recipientLabel: string;
  recipientLines: string[];
  lines: InvoiceLine[];
  baseAmount: number;
  ivaRate: number | null;
  ivaAmount: number;
  totalAmount: number;
  footerNote?: string;
}) {
  const iss = issuer();
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 790;
  const left = 56;
  const draw = (text: string, opts: { size?: number; f?: typeof font; gap?: number; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(text, { x: left, y, size: opts.size ?? 10.5, font: opts.f ?? font, color: opts.color ?? rgb(0.1, 0.1, 0.1), maxWidth: 483 });
    y -= opts.gap ?? (opts.size ?? 10.5) + 8;
  };

  draw(params.title, { size: 18, f: bold, gap: 26 });
  draw(`Nº ${params.number}`, { size: 12, f: bold, gap: 18 });
  draw(`Fecha: ${params.date.toLocaleDateString("es-ES")}`, { size: 10, color: rgb(0.45, 0.45, 0.45), gap: 26 });

  draw("Emisor", { f: bold, size: 10, color: rgb(0.45, 0.45, 0.45), gap: 14 });
  draw(iss.name, { gap: 16 });
  if (iss.nif) draw(`NIF: ${iss.nif}`, { gap: 16 });
  if (iss.address) draw(iss.address, { gap: 26 });

  draw(params.recipientLabel, { f: bold, size: 10, color: rgb(0.45, 0.45, 0.45), gap: 14 });
  for (const l of params.recipientLines) draw(l, { gap: 16 });
  y -= 10;

  draw("Concepto", { f: bold, size: 10, color: rgb(0.45, 0.45, 0.45), gap: 14 });
  for (const line of params.lines) {
    draw(line.serviceNumber ? `${line.concept}  (${line.serviceNumber})` : line.concept, { gap: 18 });
  }
  y -= 10;

  draw(`Base imponible: ${money(params.baseAmount)}`, { gap: 16 });
  if (params.ivaRate != null) {
    draw(`IVA (${params.ivaRate}%): ${money(params.ivaAmount)}`, { gap: 16 });
  } else {
    draw("Operación no sujeta a IVA / exenta", { gap: 16 });
  }
  draw(`Total: ${money(params.totalAmount)}`, { size: 13, f: bold, gap: 26 });

  if (params.footerNote) {
    draw(params.footerNote, { size: 9, color: rgb(0.55, 0.55, 0.55) });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

async function nextNumber(service: any, series: DocKind) {
  const prefix = series === "factura" ? "FAC" : series === "autofactura" ? "AUTOFAC" : "REC";
  const { data, error } = await service.rpc("next_invoice_number", { p_series: series, p_prefix: prefix });
  if (error || !data) throw new Error(error?.message ?? "No se pudo generar el número de documento");
  return data as string;
}

async function storeInvoice(service: any, path: string, pdf: Buffer) {
  const { error } = await service.storage.from("invoices").upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(error.message);
}

export async function signedInvoiceUrl(service: any, path: string) {
  const { data } = await service.storage.from("invoices").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// Factura manual a un cliente: la pide el manager desde la ficha del cliente,
// rellenando concepto, importe y tipo de IVA (sección E de
// docs/fase9-fichas-y-liquidaciones.md).
export async function generateFacturaCliente(
  params: { clientId: string; propertyId?: string | null; concept: string; baseAmount: number; ivaRate: number | null; serviceNumber?: string | null }
) {
  const service = createServiceClient();
  const { data: client } = await service.from("profiles").select("full_name, email, dni, document_type").eq("id", params.clientId).single();
  const { data: property } = params.propertyId
    ? await service.from("properties").select("address").eq("id", params.propertyId).single()
    : { data: null };

  const ivaAmount = params.ivaRate != null ? Math.round(params.baseAmount * (params.ivaRate / 100) * 100) / 100 : 0;
  const totalAmount = Math.round((params.baseAmount + ivaAmount) * 100) / 100;

  const number = await nextNumber(service, "factura");
  const pdf = await buildPdf({
    title: "FACTURA",
    number,
    date: new Date(),
    recipientLabel: "Cliente",
    recipientLines: [client?.full_name ?? "", client?.dni ? `${(client.document_type ?? "DNI").toUpperCase()}: ${client.dni}` : "", property?.address ?? ""].filter(Boolean),
    lines: [{ concept: params.concept, serviceNumber: params.serviceNumber }],
    baseAmount: params.baseAmount,
    ivaRate: params.ivaRate,
    ivaAmount,
    totalAmount,
  });

  const path = `${number}.pdf`;
  await storeInvoice(service, path, pdf);

  await service.from("invoices").insert({
    series: "factura",
    number,
    client_id: params.clientId,
    property_id: params.propertyId || null,
    concept: params.concept,
    base_amount: params.baseAmount,
    iva_rate: params.ivaRate,
    iva_amount: ivaAmount,
    total_amount: totalAmount,
    service_numbers: params.serviceNumber ? [params.serviceNumber] : null,
    storage_path: path,
    sent_to: client?.email ?? null,
  });

  if (client?.email) {
    await sendEmailWithAttachment(
      client.email,
      `Factura ${number} — Portofino`,
      `Adjuntamos su factura ${number} por ${money(totalAmount)}.`,
      pdf,
      `${number}.pdf`
    );
  }

  return { number, path };
}

// Recibo automático cada vez que se cobra una cuota/cargo a un cliente.
// Se llama justo después de insertar el pago "cobrado" correspondiente.
export async function generateReceiptForPayment(paymentId: string) {
  const service = createServiceClient();
  const { data: payment } = await service
    .from("payments")
    .select("id, client_id, property_id, concept, amount, currency")
    .eq("id", paymentId)
    .single();
  if (!payment || !payment.client_id || Number(payment.amount) <= 0) return null;

  const { data: client } = await service.from("profiles").select("full_name, email").eq("id", payment.client_id).single();
  const { data: property } = payment.property_id
    ? await service.from("properties").select("address").eq("id", payment.property_id).single()
    : { data: null };

  const number = await nextNumber(service, "recibo");
  const pdf = await buildPdf({
    title: "RECIBO",
    number,
    date: new Date(),
    recipientLabel: "Cliente",
    recipientLines: [client?.full_name ?? "", property?.address ?? ""].filter(Boolean),
    lines: [{ concept: payment.concept }],
    baseAmount: Number(payment.amount),
    ivaRate: null,
    ivaAmount: 0,
    totalAmount: Number(payment.amount),
    footerNote: "Recibo simple de cobro — no sustituye a la factura si se solicita una.",
  });

  const path = `${number}.pdf`;
  await storeInvoice(service, path, pdf);

  await service.from("invoices").insert({
    series: "recibo",
    number,
    client_id: payment.client_id,
    property_id: payment.property_id,
    payment_id: payment.id,
    concept: payment.concept,
    base_amount: Number(payment.amount),
    iva_rate: null,
    iva_amount: 0,
    total_amount: Number(payment.amount),
    storage_path: path,
    sent_to: client?.email ?? null,
  });

  if (client?.email) {
    await sendEmailWithAttachment(
      client.email,
      `Recibo ${number} — Portofino`,
      `Le confirmamos el cobro de "${payment.concept}" por ${money(Number(payment.amount))}. Adjuntamos el recibo.`,
      pdf,
      `${number}.pdf`
    );
  }

  return { number, path };
}

// Autofactura a un profesional: la redacta el manager en su nombre con los
// datos que el profesional ha aportado, cuando se le paga un servicio.
// Requiere la autorización previa del profesional (cláusula del contrato de
// colaboración) — ver sección E de docs/fase9-fichas-y-liquidaciones.md.
export async function generateAutofacturaProfesional(professionalPaymentId: string) {
  const service = createServiceClient();
  const { data: pay } = await service
    .from("professional_payments")
    .select("id, professional_id, concept, amount, visit_id, quote_id")
    .eq("id", professionalPaymentId)
    .single();
  if (!pay || Number(pay.amount) <= 0) return null;

  const { data: pro } = await service
    .from("profiles")
    .select("full_name, email, dni, document_type, fiscal_address, codigo_profesional")
    .eq("id", pay.professional_id)
    .single();

  let serviceNumber: string | null = null;
  if (pay.visit_id) {
    const { data: v } = await service.from("visits").select("service_number").eq("id", pay.visit_id).single();
    serviceNumber = v?.service_number ?? null;
  } else if (pay.quote_id) {
    const { data: q } = await service.from("quotes").select("service_number").eq("id", pay.quote_id).single();
    serviceNumber = q?.service_number ?? null;
  }

  const number = await nextNumber(service, "autofactura");
  const pdf = await buildPdf({
    title: "AUTOFACTURA",
    number,
    date: new Date(),
    recipientLabel: "Profesional (autofacturación con su autorización)",
    recipientLines: [
      `${pro?.codigo_profesional ?? ""} — ${pro?.full_name ?? ""}`,
      pro?.dni ? `${(pro.document_type ?? "DNI").toUpperCase()}: ${pro.dni}` : "",
      pro?.fiscal_address ?? "",
    ].filter(Boolean),
    lines: [{ concept: pay.concept, serviceNumber }],
    baseAmount: Number(pay.amount),
    ivaRate: null,
    ivaAmount: 0,
    totalAmount: Number(pay.amount),
    footerNote: "Autofactura emitida por Portofino en nombre y por cuenta del profesional, con su autorización previa (art. 5, RD 1619/2012).",
  });

  const path = `${number}.pdf`;
  await storeInvoice(service, path, pdf);

  await service.from("invoices").insert({
    series: "autofactura",
    number,
    professional_id: pay.professional_id,
    professional_payment_id: pay.id,
    concept: pay.concept,
    base_amount: Number(pay.amount),
    iva_rate: null,
    iva_amount: 0,
    total_amount: Number(pay.amount),
    service_numbers: serviceNumber ? [serviceNumber] : null,
    storage_path: path,
    sent_to: pro?.email ?? null,
  });

  if (pro?.email) {
    await sendEmailWithAttachment(
      pro.email,
      `Autofactura ${number} — Portofino`,
      `Adjuntamos la autofactura ${number} por el servicio "${pay.concept}" (${money(Number(pay.amount))}), ya pagado.`,
      pdf,
      `${number}.pdf`
    );
  }

  return { number, path };
}
