"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { WallMessageCard } from "@/components/WallMessageCard";
import { auraById } from "@/data/auras";
import { getMyRealId } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { postsByAuthor, savedPosts, wallMessagesForProfile } from "@/lib/store/selectors";
import { formatJoinDate } from "@/lib/time";
import { gradientCss } from "@/lib/theme";

type Tab = "posts" | "wall" | "saved";

export default function ProfilePage() {
  const { state, actions } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("posts");
  const [wallDraft, setWallDraft] = useState("");
  const profile = state.profile;

  useEffect(() => {
    actions.loadProfileWall(LOCAL_USER_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function submitWallNote() {
    const trimmed = wallDraft.trim();
    if (!trimmed) return;
    actions.addWallMessage(LOCAL_USER_ID, trimmed);
    setWallDraft("");
  }

  if (!profile) return null;

  const myRealId = getMyRealId();
  const myPosts = postsByAuthor(state.social, LOCAL_USER_ID);
  const myWall = wallMessagesForProfile(state.social, LOCAL_USER_ID);
  const mySaved = savedPosts(state.social, LOCAL_USER_ID);

  return (
    <div className="menzo-fade-in mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <div className="overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-xl">
        {profile.coverUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.coverUri} alt="" className="h-40 w-full object-cover" />
        ) : (
          <div className="h-40 w-full" style={{ background: gradientCss(auraById(profile.aura).gradient) }} />
        )}

        <div className="-mt-11 flex flex-col gap-3 px-6 pb-6">
          <div className="flex items-end justify-between">
            <div className="rounded-full ring-4 ring-[var(--color-surface)] shadow-xl">
              <Avatar name={profile.displayName} avatarUri={profile.avatarUri} gradient={profile.avatarGradient} size={92} showOnline online />
            </div>
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
            <Stat value={profile.following} label="Siguiendo" href={myRealId ? `/connections/${myRealId}/following` : undefined} />
            <Stat value={profile.followers} label="Seguidores" href={myRealId ? `/connections/${myRealId}/followers` : undefined} />
            <Stat value={profile.visitors} label="Visitantes" />
          </div>

          {!!profile.bio && <p className="text-sm text-[var(--color-text-secondary)]">{profile.bio}</p>}
          <p className="text-xs text-[var(--color-text-muted)]">Miembro desde {formatJoinDate(profile.joinedAt)}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <TabButton active={tab === "posts"} onClick={() => setTab("posts")} label="Publicaciones" />
        <TabButton active={tab === "wall"} onClick={() => setTab("wall")} label="Muro" />
        <TabButton active={tab === "saved"} onClick={() => setTab("saved")} label="Guardados" />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {tab === "posts" &&
          (myPosts.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no has publicado nada.</p>
          ) : (
            myPosts.map((post) => <PostCard key={post.id} post={post} />)
          ))}

        {tab === "wall" && (
          <>
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3">
              <input
                value={wallDraft}
                onChange={(e) => setWallDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitWallNote()}
                placeholder={`Escribe algo para ${profile.displayName}…`}
                className="flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
              />
              <button
                onClick={submitWallNote}
                disabled={!wallDraft.trim()}
                className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-medium disabled:opacity-50 cursor-pointer"
              >
                Publicar
              </button>
            </div>
            {myWall.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Este muro todavía espera su primer recuerdo.</p>
            ) : (
              myWall.map((message) => <WallMessageCard key={message.id} message={message} />)
            )}
          </>
        )}

        {tab === "saved" &&
          (mySaved.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no has guardado ningún recuerdo.</p>
          ) : (
            mySaved.map((post) => <PostCard key={post.id} post={post} />)
          ))}
      </div>
    </div>
  );
}

function Stat({ value, label, href }: { value: number; label: string; href?: string }) {
  const content = (
    <>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-75">
        {content}
      </Link>
    );
  }
  return <div>{content}</div>;
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium cursor-pointer ${
        active ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
      }`}
    >
      {label}
    </button>
  );
}
