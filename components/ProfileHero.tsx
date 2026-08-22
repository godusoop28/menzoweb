import Link from "next/link";

import { Avatar } from "@/components/Avatar";
import { SocialPlatformIcon } from "@/components/SocialPlatformIcon";
import { UserBadges } from "@/components/UserBadges";
import { UserTitles } from "@/components/UserTitles";
import { useAccent } from "@/lib/AccentContext";
import { SOCIAL_PLATFORMS } from "@/lib/social";
import { gradientCss } from "@/lib/theme";
import type { UserTitle } from "@/lib/types";
import type { GradientId } from "@/lib/theme";

export type ProfileHeroStat = { value: number; label: string; href?: string };

type ProfileHeroUser = {
  displayName: string;
  username: string;
  avatarUri?: string;
  avatarGradient: GradientId;
  coverUri?: string;
  backgroundUri?: string;
  backgroundColor?: string;
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

/** Hero de perfil compartido entre /profile (propio) y /member/[id] (ajeno) — reescrito para
 * calzar con menzomovil/lib/features/shared/profile_hero.dart: tarjeta compacta y CENTRADA
 * (avatar chico arriba, nombre/handle/nivel/bio/stats apilados debajo), no el banner cinemático
 * ancho de antes. El fondo de la tarjeta usa `coverUri` (o si no hay, `backgroundUri`/
 * `backgroundColor`, mismo dato que ya usa el fondo de pantalla completa en mobile) con un velo
 * oscuro fijo — igual criterio que ProfileBackground en mobile — en vez de un banner separado
 * gigante con el avatar montado encima. */
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
  stats = [],
}: {
  user: ProfileHeroUser;
  actions?: React.ReactNode;
  nameBadge?: React.ReactNode;
  canManageTitles?: boolean;
  onAddTitle?: (text: string, color: string) => void;
  onRemoveTitle?: (title: UserTitle) => void;
  petChip?: React.ReactNode;
  stats?: ProfileHeroStat[];
}) {
  const accent = useAccent();
  const bgImage = user.coverUri || user.backgroundUri;
  const xpRange = user.xpForNextLevel - user.xpForCurrentLevel;
  const xpProgress = xpRange <= 0 ? 1 : Math.min(1, Math.max(0, (user.xp - user.xpForCurrentLevel) / xpRange));

  return (
    <div className="flex flex-col items-center gap-3.5">
      <div className="relative w-full overflow-hidden rounded-3xl border border-[var(--color-border-soft)] shadow-xl">
        <div className="absolute inset-0">
          {bgImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={bgImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: user.backgroundColor || gradientCss(user.avatarGradient) }} />
          )}
          <div className="absolute inset-0 bg-[rgba(7,9,13,0.62)]" />
        </div>

        <div className="relative z-[1] flex flex-col items-center gap-2 px-6 py-8 text-center">
          <div className="rounded-full" style={{ boxShadow: `0 0 0 3px var(--color-surface), 0 0 24px 2px ${accent.color}66` }}>
            <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={104} showOnline online={user.isOnline} level={user.level} />
          </div>

          <div className="flex flex-wrap items-baseline justify-center gap-2">
            <h1 className="font-display text-xl font-bold">{user.displayName}</h1>
            {nameBadge}
          </div>
          <p className="-mt-1 text-sm text-[var(--color-text-muted)]">
            @{user.username}
            {user.levelName ? ` · ${user.levelName}` : ""}
          </p>
          {!!user.statusText && <p className="text-sm text-[var(--color-text-secondary)]">{user.statusText}</p>}

          <div className="mt-1 w-full max-w-[220px]">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${xpProgress * 100}%`, background: accent.color }} />
            </div>
            <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
              Nivel {user.level} · {user.xp} XP
            </p>
          </div>

          {!!user.bio && <p className="max-w-md text-sm text-[var(--color-text-secondary)]">{user.bio}</p>}

          {(canManageTitles || user.titles.length > 0) && (
            <div className="flex justify-center">
              <UserTitles titles={user.titles} canManage={!!canManageTitles} onAdd={onAddTitle} onRemove={onRemoveTitle} />
            </div>
          )}

          {user.badges.length > 0 && <UserBadges badgeIds={user.badges} />}

          {!!user.socialLinks && Object.keys(user.socialLinks).length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {SOCIAL_PLATFORMS.filter((p) => user.socialLinks?.[p.id]).map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]"
                >
                  <SocialPlatformIcon id={p.id} className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-primary)]" />
                  <span className="font-semibold text-[var(--color-text-primary)]">{p.label}</span> {user.socialLinks![p.id]}
                </span>
              ))}
            </div>
          )}

          {petChip}

          {stats.length > 0 && (
            <div className="mt-1.5 flex w-full divide-x divide-[var(--color-border-soft)] rounded-2xl bg-white/5 py-2.5">
              {stats.map((stat) => (
                <StatItem key={stat.label} stat={stat} />
              ))}
            </div>
          )}
        </div>
      </div>

      {actions && <div className="flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

function StatItem({ stat }: { stat: ProfileHeroStat }) {
  const inner = (
    <>
      <p className="text-base font-semibold">{stat.value}</p>
      <p className="text-[11px] text-[var(--color-text-muted)]">{stat.label}</p>
    </>
  );
  const className = "flex flex-1 flex-col items-center gap-0.5 transition-opacity hover:opacity-75";
  if (stat.href) {
    return (
      <Link href={stat.href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
