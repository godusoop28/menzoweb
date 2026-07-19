"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { postsByAuthor } from "@/lib/store/selectors";
import { formatJoinDate } from "@/lib/time";

export default function ProfilePage() {
  const { state, actions } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const profile = state.profile;

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await actions.refreshProfile();
      await actions.refreshSocial();
    } catch (error) {
      console.warn("[menzo/web] profile refresh failed", error);
    } finally {
      setRefreshing(false);
    }
  }

  if (!profile) return null;

  const myPosts = postsByAuthor(state.social, LOCAL_USER_ID);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <div className="overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]">
        {profile.coverUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUri} alt="" className="h-36 w-full object-cover" />
        ) : (
          <div className="h-36 w-full bg-[var(--color-surface-elevated)]" />
        )}

        <div className="-mt-11 flex flex-col gap-3 px-6 pb-6">
          <div className="flex items-end justify-between">
            <Avatar name={profile.displayName} avatarUri={profile.avatarUri} gradient={profile.avatarGradient} size={92} showOnline online />
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="rounded-full border border-[var(--color-border-soft)] px-4 py-2 text-sm text-[var(--color-text-secondary)] disabled:opacity-50 cursor-pointer"
              >
                {refreshing ? "…" : "Actualizar"}
              </button>
              <Link
                href="/profile/edit"
                className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium cursor-pointer"
              >
                Editar perfil
              </Link>
            </div>
          </div>

          <div>
            <h1 className="font-display text-xl font-bold">{profile.displayName}</h1>
            {!!profile.statusText && <p className="text-sm text-[var(--color-text-secondary)]">{profile.statusText}</p>}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--color-yellow)]">Nivel {profile.level}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 border-t border-[var(--color-border-soft)] pt-4 text-center">
            <Stat value={profile.reputation} label="Reputación" />
            <Stat value={profile.following} label="Siguiendo" />
            <Stat value={profile.followers} label="Seguidores" />
            <Stat value={profile.visitors} label="Visitantes" />
          </div>

          {!!profile.bio && <p className="text-sm text-[var(--color-text-secondary)]">{profile.bio}</p>}
          <p className="text-xs text-[var(--color-text-muted)]">Miembro desde {formatJoinDate(profile.joinedAt)}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Mis publicaciones</h2>
        {myPosts.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no has publicado nada.</p>
        ) : (
          myPosts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
