"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { GradientButton } from "@/components/GradientButton";
import { BackIcon } from "@/components/icons";
import { PostCard } from "@/components/PostCard";
import { ScreenBackground } from "@/components/ScreenBackground";
import { UserTitles } from "@/components/UserTitles";
import { WallComposer } from "@/components/WallComposer";
import { WallMessageCard } from "@/components/WallMessageCard";
import { auraById } from "@/data/auras";
import { ApiError, gamesApi } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { useToast } from "@/lib/ToastContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { postsByAuthor, wallMessagesForProfile } from "@/lib/store/selectors";
import { formatJoinDate } from "@/lib/time";
import { gradientCss } from "@/lib/theme";

type Tab = "posts" | "wall";

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useAppState();
  const showToast = useToast();
  const [tab, setTab] = useState<Tab>("posts");
  const [openingChat, setOpeningChat] = useState(false);
  const [challenging, setChallenging] = useState(false);

  const isSelf = id === LOCAL_USER_ID;
  const user = state.social.users.find((u) => u.id === id);

  useEffect(() => {
    if (!id || isSelf) return;
    actions.addRecentlyViewed({ kind: "member", id, at: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    // refreshUser, no ensureUserLoaded — este último se salta el fetch si el id ya apareció como
    // autor liviano de un post/mensaje en otra parte, lo que dejaba esta pantalla de perfil
    // mostrando datos viejos (p.ej. títulos que otro LEADER acaba de poner) hasta un refresh
    // completo del navegador.
    if (!isSelf) actions.refreshUser(id);
    actions.loadProfileWall(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isSelf) router.replace("/profile");
  }, [isSelf, router]);

  if (isSelf) return null;

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">No encontramos este perfil.</p>
        <button onClick={() => router.back()} className="text-sm text-[var(--color-cyan)] cursor-pointer">
          Volver
        </button>
      </div>
    );
  }

  const isFollowing = state.social.following.includes(user.id);
  const followsMe = !!user.followsMe;
  const isFriend = isFollowing && followsMe;
  // "Siguiendo" y "Amigos" nunca se muestran a la vez (ver punto 16 del pedido) — una vez que hay
  // amistad, el botón pasa a describir la acción real (dejar de seguir) en vez de repetir el badge.
  const followButtonLabel = isFriend ? "Dejar de seguir" : isFollowing ? "Siguiendo" : followsMe ? "Seguir también" : "Seguir";
  const posts = postsByAuthor(state.social, user.id);
  const wall = wallMessagesForProfile(state.social, user.id);

  async function handleMessage() {
    if (openingChat) return;
    setOpeningChat(true);
    const roomId = await actions.openDirectMessage(user!.id);
    setOpeningChat(false);
    if (roomId) router.push(`/chat/${roomId}`);
  }

  async function handleChallenge() {
    if (challenging || !user) return;
    setChallenging(true);
    try {
      const match = await gamesApi.createMatch({ gameType: "TIC_TAC_TOE", opponentId: user.id });
      router.push(`/games/matches/${match.id}`);
    } catch (error) {
      console.warn("[menzo/web] createMatch failed", error);
      showToast(error instanceof ApiError ? error.message : "No pudimos crear la partida.");
    } finally {
      setChallenging(false);
    }
  }

  const hasBackground = !!(user.backgroundUri || user.backgroundColor);
  const canManageTitles = state.profile?.globalRole === "LEADER" || state.profile?.globalRole === "MASTER";

  const content = (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
        <BackIcon size={20} />
        Volver
      </button>

      <div className="overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-xl">
        {user.coverUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.coverUri} alt="" className="h-40 w-full object-cover" />
        ) : (
          <div className="h-40 w-full" style={{ background: gradientCss(auraById(user.aura).gradient) }} />
        )}

        <div className="-mt-11 flex flex-col gap-3 px-6 pb-6">
          <div className="flex items-end justify-between gap-3">
            <div className="rounded-full ring-4 ring-[var(--color-surface)] shadow-xl">
              <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={92} showOnline online={user.isOnline} level={user.level} />
            </div>
            <div className="flex gap-2">
              <GradientButton
                label={followButtonLabel}
                onClick={() => actions.toggleFollow(user.id)}
                gradient={isFollowing ? "community" : "fire"}
                size="md"
                fullWidth={false}
              />
              <button
                onClick={handleMessage}
                disabled={openingChat}
                className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                Mensaje
              </button>
              <button
                onClick={handleChallenge}
                disabled={challenging}
                className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                Jugar
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold">{user.displayName}</h1>
              {isFriend ? (
                <span className="rounded-full bg-[var(--color-surface-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-cyan)]">
                  Amigos
                </span>
              ) : (
                !isFollowing &&
                followsMe && (
                  <span className="rounded-full bg-[var(--color-surface-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                    Te sigue
                  </span>
                )
              )}
            </div>
            {!!user.statusText && <p className="text-sm text-[var(--color-text-secondary)]">{user.statusText}</p>}
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-yellow)]/40 bg-[var(--color-yellow)]/10 px-3 py-1 text-xs font-semibold text-[var(--color-yellow)]">
              <span aria-hidden>★</span>
              Nivel {user.level}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 border-t border-[var(--color-border-soft)] pt-4 text-center">
            <Stat value={user.reputation} label="Reputación" />
            <Stat value={user.following} label="Siguiendo" href={`/connections/${user.id}/following`} />
            <Stat value={user.followers} label="Seguidores" href={`/connections/${user.id}/followers`} />
            <Stat value={user.visitors} label="Visitantes" />
          </div>

          {!!user.bio && <p className="text-sm text-[var(--color-text-secondary)]">{user.bio}</p>}
          <p className="text-xs text-[var(--color-text-muted)]">Miembro desde {formatJoinDate(user.joinedAt)}</p>
          <UserTitles
            titles={user.titles}
            canManage={canManageTitles}
            onAdd={(text, color) => actions.addUserTitle(user.id, text, color)}
            onRemove={(title) => actions.removeUserTitle(user.id, title.id)}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <TabButton active={tab === "posts"} onClick={() => setTab("posts")} label="Publicaciones" />
        <TabButton active={tab === "wall"} onClick={() => setTab("wall")} label="Muro" />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {tab === "posts" &&
          (posts.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">{user.displayName} todavía no ha publicado nada.</p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ))}

        {tab === "wall" && (
          <>
            <WallComposer profileId={user.id} placeholder={`Escribe algo para ${user.displayName}…`} />
            {wall.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Este muro todavía espera su primer recuerdo.</p>
            ) : (
              wall.map((message) => <WallMessageCard key={message.id} message={message} />)
            )}
          </>
        )}
      </div>
    </div>
  );

  if (!hasBackground) return content;
  return (
    <ScreenBackground src={user.backgroundUri} color={user.backgroundColor}>
      {content}
    </ScreenBackground>
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
