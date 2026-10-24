import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateSignatureCertificate } from "@/lib/contract-pdf";

const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };

async function sendEmail(to: string, subject: string, text: string) {
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
      }),
    });
  } catch {
    // No bloqueamos la firma si el email falla.
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { signatureName } = await req.json().catch(() => ({}));
  if (!signatureName || !signatureName.trim()) {
    return NextResponse.json({ error: "Escriba su nombre completo para firmar" }, { status: 400 });
  }

  const { data: contract } = await supabase
    .from("contracts")
    .select("id, status, client_id, property_id, properties(address, plan)")
    .eq("id", params.id)
    .single();

  if (!contract || contract.client_id !== user.id) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (contract.status !== "pendiente") return NextResponse.json({ error: "Este contrato ya está firmado" }, { status: 400 });

  const property = Array.isArray(contract.properties) ? contract.properties[0] : (contract.properties as any);
  const signedAt = new Date();

  const pdfBytes = await generateSignatureCertificate({
    clientName: signatureName.trim(),
    clientEmail: user.email ?? "",
    propertyAddress: property?.address ?? "",
    plan: PLAN_LABEL[property?.plan] ?? property?.plan ?? "",
    signatureName: signatureName.trim(),
    signedAt,
  });

  const signedPath = `signed/${contract.property_id}/${contract.client_id}.pdf`;
  const service = createServiceClient();
  const { error: uploadError } = await service.storage.from("contracts").upload(signedPath, pdfBytes, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 400 });

  const { error: rpcError } = await supabase.rpc("sign_contract", {
    p_contract_id: contract.id,
    p_signature_name: signatureName.trim(),
    p_signed_storage_path: signedPath,
  });
  if (rpcError) return NextResponse.json({ error: rpcError.message }, { status: 400 });

  const resumen = [
    `Vivienda: ${property?.address ?? ""}`,
    `Cliente: ${user.email}`,
    `Firmado como: ${signatureName.trim()}`,
    `Fecha: ${signedAt.toLocaleString("es-ES")}`,
  ].join("\n");

  const subject = `Contrato firmado — ${property?.address ?? ""}`;
  if (user.email) await sendEmail(user.email, subject, `Ha firmado el contrato de Portofino.\n\n${resumen}\n\nPuede descargarlo desde la sección Documentación del portal.`);
  if (process.env.MANAGER_NOTIFICATION_EMAIL) {
    await sendEmail(process.env.MANAGER_NOTIFICATION_EMAIL, subject, `Un cliente ha firmado su contrato.\n\n${resumen}`);
  }

  return NextResponse.json({ ok: true });
}
