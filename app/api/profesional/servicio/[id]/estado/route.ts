import { NextResponse } from "next/server";
import { requireProfessional, loadOwnVisit } from "@/lib/professional-access";

// "Estoy aquí" (llegada) y "Cerrar servicio" (salida + visita realizada).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProfessional();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { action } = await req.json().catch(() => ({}));
  if (action !== "llegada" && action !== "cerrar") return NextResponse.json({ error: "Acción no válida" }, { status: 400 });

  const { service, visit } = await loadOwnVisit(params.id, auth.user.id);
  if (!visit) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  if (visit.status !== "programada") return NextResponse.json({ error: "Este servicio ya está cerrado" }, { status: 400 });

  if (action === "llegada") {
    if (visit.arrived_at) return NextResponse.json({ ok: true });
    const { error } = await service.from("visits").update({ arrived_at: new Date().toISOString() }).eq("id", visit.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (!visit.arrived_at) return NextResponse.json({ error: "Pulse primero «Estoy aquí»" }, { status: 400 });
  const now = new Date();
  const { error } = await service
    .from("visits")
    .update({ departed_at: now.toISOString(), status: "hecha", completed_date: now.toISOString().slice(0, 10) })
    .eq("id", visit.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
