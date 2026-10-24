import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLAN_LABEL: Record<string, string> = { essential: "Essential", comfort: "Comfort", premium: "Premium" };

function addYears(date: Date, years: number) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

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
    // Un fallo en el envío no debe romper la baja ya registrada.
  }
}

// Paso 1: solo calcula y devuelve la información de permanencia, sin confirmar nada.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: property } = await supabase
    .from("properties")
    .select("id, address, plan, billing_mode, contract_start_date, subscription_status")
    .eq("id", params.id)
    .single();

  if (!property) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const commitmentEnd =
    property.billing_mode === "annual" ? addYears(new Date(property.contract_start_date), 1) : null;
  const insideCommitment = commitmentEnd ? commitmentEnd.getTime() > Date.now() : false;

  return NextResponse.json({
    address: property.address,
    plan: property.plan,
    billingMode: property.billing_mode,
    subscriptionStatus: property.subscription_status,
    commitmentEnd: commitmentEnd?.toISOString() ?? null,
    insideCommitment,
  });
}

// Paso 2: confirma la baja. Avisa por email a cliente y manager con todas las condiciones.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { reason } = await req.json().catch(() => ({ reason: undefined }));

  const { data: property } = await supabase
    .from("properties")
    .select("id, address, plan, billing_mode, contract_start_date, subscription_status")
    .eq("id", params.id)
    .single();

  if (!property) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  if (property.subscription_status !== "activa") {
    return NextResponse.json({ error: "Esta vivienda ya tiene una baja en curso o confirmada" }, { status: 400 });
  }

  const commitmentEnd =
    property.billing_mode === "annual" ? addYears(new Date(property.contract_start_date), 1) : null;
  const insideCommitment = commitmentEnd ? commitmentEnd.getTime() > Date.now() : false;
  const effectiveAt = insideCommitment && commitmentEnd ? commitmentEnd : new Date();

  const { error } = await supabase
    .from("properties")
    .update({
      subscription_status: "baja_solicitada",
      cancellation_requested_at: new Date().toISOString(),
      cancellation_effective_at: effectiveAt.toISOString(),
      cancellation_reason: reason ?? null,
    })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const fecha = (d: Date) => d.toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });
  const resumen = [
    `Vivienda: ${property.address}`,
    `Plan: ${PLAN_LABEL[property.plan] ?? property.plan}`,
    `Facturación: ${property.billing_mode === "annual" ? "anual" : "flexible"}`,
    `Fecha de solicitud: ${fecha(new Date())}`,
    insideCommitment
      ? `Compromiso de permanencia activo hasta el ${fecha(commitmentEnd!)}. La baja será efectiva en esa fecha, salvo que apliquen las condiciones de cancelación anticipada recogidas en su contrato.`
      : `Sin compromiso de permanencia pendiente. La baja será efectiva de inmediato.`,
    reason ? `Motivo indicado por el cliente: ${reason}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const subject = `Baja solicitada — ${property.address}`;
  if (user.email) {
    await sendEmail(user.email, subject, `Confirmamos su solicitud de baja de Portofino.\n\n${resumen}`);
  }
  if (process.env.MANAGER_NOTIFICATION_EMAIL) {
    await sendEmail(
      process.env.MANAGER_NOTIFICATION_EMAIL,
      subject,
      `${user.email} ha solicitado la baja de una vivienda.\n\n${resumen}`
    );
  }

  return NextResponse.json({ ok: true, insideCommitment, effectiveAt: effectiveAt.toISOString() });
}
