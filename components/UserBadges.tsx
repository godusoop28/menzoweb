import { badgeById } from "@/data/badges";
import { gradientCss } from "@/lib/theme";

/** Insignias (profile.badges, ver UserProfileResponse en menzoapi) — distintas de los títulos
 * (UserTitles): un título lo otorga un LEADER y es una etiqueta social libre, una insignia es un
 * logro fijo del catálogo (ver data/badges.ts). Nunca se mostraban en ningún lado de la UI. */
export function UserBadges({ badgeIds }: { badgeIds: string[] }) {
  const resolved = badgeIds.map((id) => badgeById(id)).filter((b): b is NonNullable<typeof b> => !!b);
  if (resolved.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {resolved.map((badge) => (
        <div key={badge.id} className="flex flex-col items-center gap-1.5" title={badge.description}>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 text-lg font-bold text-white shadow-[0_0_16px_-4px_rgba(124,77,255,0.5)]"
            style={{ background: gradientCss(badge.gradient) }}
            aria-hidden
          >
            ★
          </div>
          <span className="max-w-16 truncate text-center text-[10px] text-[var(--color-text-muted)]">{badge.name}</span>
        </div>
      ))}
    </div>
  );
}
