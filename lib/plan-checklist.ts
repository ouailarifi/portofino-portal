// Checklist de un servicio = las prestaciones del plan contratado por el cliente
// (tabla "plans", columna "items"), acumulando las de los planes inferiores:
// Comfort incluye Essential, Premium incluye Comfort, Platinum incluye Premium.
//
// Las líneas de los planes mezclan tareas que se hacen en la vivienda con
// compromisos que no se "marcan" en una visita (tiempos de respuesta,
// frecuencia, gestor de cuenta, informes). Estas últimas se excluyen de la
// checklist; la lista de patrones está aquí, a la vista, para poder ajustarla.

export const PLAN_ORDER = ["essential", "comfort", "premium", "platinum"] as const;

const NOT_A_TASK: RegExp[] = [
  /^todo lo de/i, // cabecera de herencia ("Todo lo de Comfort, ... y además:")
  /^respuesta/i, // tiempos de respuesta
  /^visitas? prácticamente diarias/i, // frecuencia
  /^una visita de revisión completa/i, // frecuencia
  /^gestor de cuenta/i,
  /^informe (mensual|fotográfico)/i,
  /^prioridad de atención/i,
  /^revisión prioritaria/i,
  /^coordinación ilimitada/i,
];

export type ChecklistItem = { key: string; label: string; done: boolean; photo_path: string | null };

type PlanRow = { slug: string; items: string[] | null };

export function checklistLabelsForPlan(planSlug: string, plans: PlanRow[]): string[] {
  const idx = PLAN_ORDER.indexOf(planSlug as (typeof PLAN_ORDER)[number]);
  if (idx < 0) return [];
  const labels: string[] = [];
  for (const slug of PLAN_ORDER.slice(0, idx + 1)) {
    const plan = plans.find((p) => p.slug === slug);
    for (const raw of plan?.items ?? []) {
      const text = raw.trim();
      if (!text || NOT_A_TASK.some((re) => re.test(text))) continue;
      if (!labels.includes(text)) labels.push(text);
    }
  }
  return labels;
}

// Clave estable por tarea (no depende del orden) para enlazar el estado guardado.
export function itemKey(label: string) {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = (h * 31 + label.charCodeAt(i)) | 0;
  return `t${(h >>> 0).toString(36)}`;
}

// Combina las tareas actuales del plan con lo ya guardado en visits.checklist.
export function mergeChecklist(labels: string[], saved: unknown): ChecklistItem[] {
  const savedItems: ChecklistItem[] = Array.isArray(saved) ? (saved as ChecklistItem[]) : [];
  return labels.map((label) => {
    const key = itemKey(label);
    const prev = savedItems.find((s) => s.key === key);
    return { key, label, done: prev?.done ?? false, photo_path: prev?.photo_path ?? null };
  });
}
