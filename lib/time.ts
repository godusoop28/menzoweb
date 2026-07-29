export function relativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);

  if (diffSec < 60) return "ahora";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `hace ${diffHour} h`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `hace ${diffDay} d`;
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

export function formatJoinDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

export function isSameDay(isoA: string, isoB: string): boolean {
  const a = new Date(isoA);
  const b = new Date(isoB);
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Separador de fecha para listas de mensajes tipo chat — "Hoy"/"Ayer" para los últimos dos días,
 * fecha completa para el resto. */
export function dateSeparatorLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (isSameDay(iso, today.toISOString())) return "Hoy";
  if (isSameDay(iso, yesterday.toISOString())) return "Ayer";
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined });
}
