/** "Nivel X · Nombre" + barra de progreso hacia el próximo nivel — usado en el perfil propio y en
 * el de terceros. Ver LevelCurve en menzoapi: la curva es exponencial, así que a niveles altos la
 * barra avanza mucho más lento que a niveles bajos, eso es intencional. */
export function LevelBadge({
  level,
  levelName,
  xp,
  xpForCurrentLevel,
  xpForNextLevel,
}: {
  level: number;
  levelName?: string;
  xp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
}) {
  const maxed = xpForNextLevel <= xpForCurrentLevel;
  const progress = maxed
    ? 1
    : Math.max(0, Math.min(1, (xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)));

  return (
    <div className="flex flex-col gap-1.5">
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--color-yellow)]/40 bg-[var(--color-yellow)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-yellow)]">
        <span aria-hidden>★</span>
        Nivel {level}
        {!!levelName && <span className="text-[var(--color-yellow)]/70">· {levelName}</span>}
      </span>
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-[var(--color-surface-secondary)]" title={maxed ? "Nivel máximo" : `${xp} / ${xpForNextLevel} XP`}>
        <div
          className="h-full rounded-full bg-[var(--color-yellow)]"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
