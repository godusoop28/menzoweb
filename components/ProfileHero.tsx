import { Avatar } from "@/components/Avatar";
import { LevelBadge } from "@/components/LevelBadge";
import { UserBadges } from "@/components/UserBadges";
import { UserTitles } from "@/components/UserTitles";
import { useAccent } from "@/lib/AccentContext";
import { SOCIAL_PLATFORMS } from "@/lib/social";
import { gradientCss } from "@/lib/theme";
import type { UserTitle } from "@/lib/types";
import type { GradientId } from "@/lib/theme";

type ProfileHeroUser = {
  displayName: string;
  username: string;
  avatarUri?: string;
  avatarGradient: GradientId;
  coverUri?: string;
  isOnline: boolean;
  level: number;
  levelName?: string;
  xp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  bio: string;
  statusText?: string;
  titles: UserTitle[];
  badges: string[];
  socialLinks?: Record<string, string>;
};

/** Hero de perfil compartido entre /profile (propio) y /member/[id] (ajeno) — antes duplicado
 * casi entero entre ambas páginas. Cinematográfico y grande (sección 15/60 del rediseño: "debe
 * verse como la referencia") en vez de una portada chica con el avatar empujado a una tarjeta
 * aparte debajo — acá nombre/handle/nivel/títulos/bio viven DENTRO del propio hero, junto al
 * avatar, como en la referencia. */
export function ProfileHero({
  user,
  actions,
  /** "Amigos"/"Te sigue" en el perfil de otro miembro — no aplica al propio. */
  nameBadge,
  canManageTitles,
  onAddTitle,
  onRemoveTitle,
  /** <ProfilePetChip userId={...} isSelf={...} /> — quien llama resuelve el id real, ver ese
   * componente. Ausente = no se muestra nada (mismo criterio que el resto de secciones
   * opcionales de este hero). */
  petChip,
}: {
  user: ProfileHeroUser;
  actions?: React.ReactNode;
  nameBadge?: React.ReactNode;
  canManageTitles?: boolean;
  onAddTitle?: (text: string, color: string) => void;
  onRemoveTitle?: (title: UserTitle) => void;
  petChip?: React.ReactNode;
}) {
  const accent = useAccent();

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-xl">
      <div className="relative min-h-[280px] w-full sm:min-h-[300px]">
        {user.coverUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.coverUri} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: gradientCss(user.avatarGradient) }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-[var(--color-surface)]/10 to-transparent" />

        <div className="relative z-[1] flex flex-col items-start gap-5 px-6 pb-6 pt-24 sm:flex-row sm:items-end sm:pt-32">
          <div className="shrink-0 rounded-full" style={{ boxShadow: `0 0 0 4px var(--color-surface), 0 0 32px 3px ${accent.color}66` }}>
            <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={132} showOnline online={user.isOnline} level={user.level} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="font-display text-3xl font-bold sm:text-[2.25rem]">{user.displayName}</h1>
              {nameBadge}
            </div>
            <p className="mt-0.5 text-base text-[var(--color-text-muted)]">@{user.username}</p>
            {!!user.statusText && <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">{user.statusText}</p>}

            <div className="mt-3">
              <LevelBadge level={user.level} levelName={user.levelName} xp={user.xp} xpForCurrentLevel={user.xpForCurrentLevel} xpForNextLevel={user.xpForNextLevel} />
            </div>

            <div className="mt-3">
              <UserTitles titles={user.titles} canManage={!!canManageTitles} onAdd={onAddTitle} onRemove={onRemoveTitle} />
            </div>

            {!!user.bio && <p className="mt-3 max-w-2xl text-sm text-[var(--color-text-secondary)]">{user.bio}</p>}

            {user.badges.length > 0 && (
              <div className="mt-4">
                <UserBadges badgeIds={user.badges} />
              </div>
            )}

            {!!user.socialLinks && Object.keys(user.socialLinks).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SOCIAL_PLATFORMS.filter((p) => user.socialLinks?.[p.id]).map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]"
                  >
                    <span className="font-semibold text-[var(--color-text-primary)]">{p.label}</span>{" "}
                    {user.socialLinks![p.id]}
                  </span>
                ))}
              </div>
            )}

            {petChip}
          </div>

          {actions && <div className="flex shrink-0 flex-wrap gap-2 sm:self-end">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
