import { NextResponse } from "next/server";
import { requireProfessional, loadOwnVisit } from "@/lib/professional-access";
import { evaluateReschedule, FLAG_TEXT } from "@/lib/reschedule-rules";

// Cambio de cita por el profesional. Con { preview: true } solo evalúa las reglas
// (para avisar antes de confirmar); sin preview aplica el cambio y lo deja registrado.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireProfessional();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { newDate, reason, preview } = await req.json().catch(() => ({}));
  if (typeof newDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
    return NextResponse.json({ error: "Indique la nueva fecha" }, { status: 400 });
  }
  if (newDate < new Date().toISOString().slice(0, 10)) {
    return NextResponse.json({ error: "La nueva fecha no puede ser anterior a hoy" }, { status: 400 });
  }

  const { service, visit } = await loadOwnVisit(params.id, auth.user.id);
  if (!visit) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
  if (visit.status !== "programada") return NextResponse.json({ error: "Este servicio ya está cerrado" }, { status: 400 });

  const [{ data: others }, { data: entries }] = await Promise.all([
    service
      .from("visits")
      .select("scheduled_date")
      .eq("property_id", visit.property_id)
      .neq("id", visit.id)
      .neq("status", "fallida")
      .not("scheduled_date", "is", null),
    service.from("property_calendar_entries").select("entry_type, week_start").eq("property_id", visit.property_id),
  ]);

  const evaluation = evaluateReschedule({
    oldDate: visit.scheduled_date,
    newDate,
    plan: visit.properties?.plan,
    otherVisitDates: (others ?? []).map((o: any) => o.scheduled_date),
    preferredWeeks: (entries ?? []).filter((e: any) => e.entry_type === "visita_preferida").map((e: any) => e.week_start),
    occupiedWeeks: (entries ?? []).filter((e: any) => e.entry_type === "ocupacion").map((e: any) => e.week_start),
  });
  const warnings = evaluation.flags.map((f) => FLAG_TEXT[f]);

  if (preview) return NextResponse.json({ sameWeek: evaluation.sameWeek, flags: evaluation.flags, warnings });

  const motivo = typeof reason === "string" ? reason.trim() : "";
  if (evaluation.flags.length && !motivo) {
    return NextResponse.json({ error: "Indique el motivo del cambio", needsReason: true, flags: evaluation.flags, warnings }, { status: 400 });
  }

  const { error: updateError } = await service.from("visits").update({ scheduled_date: newDate }).eq("id", visit.id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  const { error: logError } = await service.from("visit_reschedules").insert({
    visit_id: visit.id,
    professional_id: auth.user.id,
    property_id: visit.property_id,
    old_date: visit.scheduled_date,
    new_date: newDate,
    same_week: evaluation.sameWeek,
    flags: evaluation.flags,
    reason: motivo || null,
  });
  if (logError) return NextResponse.json({ error: `Cita cambiada, pero no se pudo registrar: ${logError.message}` }, { status: 500 });

  return NextResponse.json({ ok: true, flags: evaluation.flags });
}
