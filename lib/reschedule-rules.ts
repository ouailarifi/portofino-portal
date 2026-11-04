// Reglas de cambio de cita hechas por el profesional.
//
// - Dentro de la MISMA semana (lunes a domingo): se permite sin alerta; solo se registra.
// - A OTRA semana: se permite pero se evalúa y, si salta alguna alerta, el profesional
//   debe indicar el motivo y el manager recibe un aviso:
//     · limite_plan: el plan no admite otra visita en esa semana/mes
//         Essential = 1 al mes · Comfort = 2 al mes · Premium = 1 por semana · Platinum = sin límite
//     · semana_ocupada: el cliente marcó esa semana como "voy a estar"
//     · fuera_preferencia: el cliente no marcó esa semana como "prefiero visita"
//
// Todo con fechas AAAA-MM-DD y aritmética en UTC para que el resultado no dependa
// de la zona horaria del servidor.

const DAY = 86400000;

function parse(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function weekStartOf(date: string) {
  const t = parse(date);
  const dow = new Date(t).getUTCDay(); // 0 = domingo
  const diff = dow === 0 ? -6 : 1 - dow;
  return new Date(t + diff * DAY).toISOString().slice(0, 10);
}

export type RescheduleFlag = "limite_plan" | "fuera_preferencia" | "semana_ocupada";

export const FLAG_TEXT: Record<RescheduleFlag, string> = {
  limite_plan: "Su plan no admite otra visita en ese periodo.",
  semana_ocupada: "El cliente ha marcado esa semana como «voy a estar» en la vivienda.",
  fuera_preferencia: "Esa semana no es una de las que el cliente prefiere para la visita.",
};

const PLAN_LIMIT: Record<string, { per: "week" | "month"; max: number } | null> = {
  essential: { per: "month", max: 1 },
  comfort: { per: "month", max: 2 },
  premium: { per: "week", max: 1 },
  platinum: null,
};

export function evaluateReschedule(args: {
  oldDate: string | null;
  newDate: string;
  plan: string;
  otherVisitDates: string[]; // otras visitas de la misma vivienda (no fallidas, con fecha)
  preferredWeeks: string[]; // lunes AAAA-MM-DD
  occupiedWeeks: string[];
}): { sameWeek: boolean; flags: RescheduleFlag[] } {
  const { oldDate, newDate, plan, otherVisitDates, preferredWeeks, occupiedWeeks } = args;
  const week = weekStartOf(newDate);

  if (oldDate && weekStartOf(oldDate) === week) return { sameWeek: true, flags: [] };

  const flags: RescheduleFlag[] = [];

  const limit = PLAN_LIMIT[plan];
  if (limit) {
    const inPeriod = otherVisitDates.filter((d) =>
      limit.per === "week" ? weekStartOf(d) === week : d.slice(0, 7) === newDate.slice(0, 7)
    ).length;
    if (inPeriod >= limit.max) flags.push("limite_plan");
  }

  if (occupiedWeeks.includes(week)) flags.push("semana_ocupada");
  else if (!preferredWeeks.includes(week)) flags.push("fuera_preferencia");

  return { sameWeek: false, flags };
}
