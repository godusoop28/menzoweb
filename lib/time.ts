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
