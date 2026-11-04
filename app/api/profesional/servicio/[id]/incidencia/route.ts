import { NextResponse } from "next/server";
import { requireProfessional, loadOwnVisit } from "@/lib/professional-access";

// El profesional avisa de una incidencia durante el servicio. La valoración
// (si la cubre el plan, el precio, el consentimiento del cliente) la hace el manager:
// por eso aquí no se rellena covered_by_plan ni el importe.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProfessional();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { type, description, accessReason } = await req.json().catch(() => ({}));
  if (type !== "reparacion" && type !== "acceso") return NextResponse.json({ error: "Tipo no válido" }, { status: 400 });
  if (typeof description !== "string" || !description.trim()) return NextResponse.json({ error: "Describa qué ha pasado" }, { status: 400 });
  if (type === "acceso" && !["invitados_en_vivienda", "propietario_rechaza", "otro"].includes(accessReason)) {
    return NextResponse.json({ error: "Indique el motivo" }, { status: 400 });
  }

  const { service, visit } = await loadOwnVisit(params.id, auth.user.id);
  if (!visit) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  const { error } = await service.from("incidents").insert({
    visit_id: visit.id,
    property_id: visit.property_id,
    type,
    description: description.trim(),
    covered_by_plan: null,
    repair_price: null,
    client_consent_status: "no_aplica",
    access_reason: type === "acceso" ? accessReason : null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
