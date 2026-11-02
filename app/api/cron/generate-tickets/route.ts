import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Vercel añade automáticamente la cabecera Authorization: Bearer $CRON_SECRET
// a las llamadas de un cron job cuando esa variable de entorno existe —
// https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
// Generación automática de tickets (visitas) según plan:
//   Essential = 1 al mes · Comfort = 2 al mes (quincenal) · Premium = 1 a la semana
//   Platinum = manual, el manager los crea a mano (no entra en esta función).
// La idempotencia la garantiza visits.period_key (índice único por vivienda+periodo),
// así que este endpoint se puede llamar más de una vez al día sin duplicar tickets.
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const service = createServiceClient();
  const { data, error } = await service.rpc("generate_due_visit_tickets");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, created: data?.length ?? 0, tickets: data ?? [] });
}
