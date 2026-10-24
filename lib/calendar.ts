// Semanas en formato ISO (lunes a domingo). El cliente solo puede marcar
// semanas que empiecen al menos 7 días a partir de hoy (aviso mínimo de una
// semana para que el equipo pueda organizarse).

export function mondayOf(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = domingo
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function earliestSelectableWeek(now: Date = new Date()) {
  const min = new Date(now);
  min.setDate(min.getDate() + 7);
  return mondayOf(min);
}

export function isSelectable(weekStart: string, now: Date = new Date()) {
  return new Date(weekStart).getTime() >= earliestSelectableWeek(now).getTime();
}

export function nextWeeks(count: number, now: Date = new Date()) {
  const start = earliestSelectableWeek(now);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    return d;
  });
}

export function weekLabel(weekStart: Date) {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
  return `${fmt(weekStart)} — ${fmt(end)}`;
}

export function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}
