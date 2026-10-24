import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const GREMIO_LABEL: Record<string, string> = {
  carpinteria_madera: "Carpintería de madera",
  albanileria_reforma: "Albañilería / reforma",
  cristaleria: "Cristalería",
  carpinteria_metalica: "Carpintería metálica",
  reforma_general: "Reforma general",
};

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
    // No bloqueamos la solicitud si el email falla.
  }
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { propertyId, gremio, description } = await req.json().catch(() => ({}));

  if (!GREMIO_LABEL[gremio]) return NextResponse.json({ error: "Gremio no válido" }, { status: 400 });
  if (!description || !description.trim()) return NextResponse.json({ error: "Describa lo que necesita" }, { status: 400 });

  let propertyAddress: string | null = null;
  if (propertyId) {
    const { data: property } = await supabase.from("properties").select("address").eq("id", propertyId).single();
    if (!property) return NextResponse.json({ error: "Vivienda no encontrada" }, { status: 404 });
    propertyAddress = property.address;
  }

  const { error } = await supabase.from("quote_requests").insert({
    client_id: user.id,
    property_id: propertyId || null,
    gremio,
    description: description.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (process.env.MANAGER_NOTIFICATION_EMAIL) {
    await sendEmail(
      process.env.MANAGER_NOTIFICATION_EMAIL,
      `Nueva solicitud de presupuesto — ${GREMIO_LABEL[gremio]}`,
      [
        `Cliente: ${user.email}`,
        propertyAddress ? `Vivienda: ${propertyAddress}` : null,
        `Gremio: ${GREMIO_LABEL[gremio]}`,
        "",
        "Descripción del cliente:",
        description.trim(),
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return NextResponse.json({ ok: true });
}
