import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PLAN_ORDER = ["essential", "comfort", "premium"];

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { propertyId, requestedPlan } = await req.json();
  if (!propertyId || !PLAN_ORDER.includes(requestedPlan)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // RLS ya garantiza que solo se puede leer una vivienda propia.
  const { data: property } = await supabase
    .from("properties")
    .select("id, address, plan")
    .eq("id", propertyId)
    .single();

  if (!property) return NextResponse.json({ error: "Vivienda no encontrada" }, { status: 404 });

  if (PLAN_ORDER.indexOf(requestedPlan) <= PLAN_ORDER.indexOf(property.plan)) {
    return NextResponse.json({ error: "Solo se puede pedir un plan superior al actual" }, { status: 400 });
  }

  const { error } = await supabase.from("plan_upgrade_requests").insert({
    client_id: user.id,
    property_id: propertyId,
    current_plan: property.plan,
    requested_plan: requestedPlan,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Aviso por email al manager, si hay un proveedor de email configurado.
  // Sin RESEND_API_KEY la petición se guarda igual; solo no llega el aviso.
  if (process.env.RESEND_API_KEY && process.env.MANAGER_NOTIFICATION_EMAIL) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? "Portofino <notificaciones@portofino.com>",
          to: process.env.MANAGER_NOTIFICATION_EMAIL,
          subject: `Petición de cambio de plan — ${property.address}`,
          text: `${user.email} ha pedido subir de plan "${property.plan}" a "${requestedPlan}" para la vivienda: ${property.address}.\n\nRevísalo en Supabase → Table Editor → plan_upgrade_requests.`,
        }),
      });
    } catch {
      // Un fallo en el email no debe romper la petición ya guardada.
    }
  }

  return NextResponse.json({ ok: true });
}
