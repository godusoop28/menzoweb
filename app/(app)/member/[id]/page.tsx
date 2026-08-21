"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { ContextSidebar, ContextSidebarSection } from "@/components/ContextSidebar";
import { GradientButton } from "@/components/GradientButton";
import { BackIcon, LiveIcon, UsersIcon } from "@/components/icons";
import { LiveRoomsCarousel } from "@/components/LiveRoomsCarousel";
import { PostCard } from "@/components/PostCard";
import { ProfileHero } from "@/components/ProfileHero";
import { ScreenBackground } from "@/components/ScreenBackground";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { WallComposer } from "@/components/WallComposer";
import { WallMessageCard } from "@/components/WallMessageCard";
import { communitiesApi } from "@/lib/api";
import { toGradient } from "@/lib/api/mappers";
import type { CommunityMemberDto } from "@/lib/api/types";
import { useAppState } from "@/lib/AppStateContext";
import { useCommunity } from "@/lib/communities/CommunityContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { postsByAuthor, wallMessagesForProfile } from "@/lib/store/selectors";
import { formatJoinDate } from "@/lib/time";

type Tab = "posts" | "wall" | "blogs";

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useAppState();
  const { activeCommunity, activeCommunityDetail } = useCommunity();
  const [tab, setTab] = useState<Tab>("posts");
  const [openingChat, setOpeningChat] = useState(false);
  const [rosterMembers, setRosterMembers] = useState<CommunityMemberDto[]>([]);
  const [rosterLoadedFor, setRosterLoadedFor] = useState<string | undefined>(undefined);

  const isSelf = id === LOCAL_USER_ID;
  const user = state.social.users.find((u) => u.id === id);

  // Panel derecho (lg:+, ver más abajo) — mismos datos reales que ya usa Inicio/Miembros
  // (communitiesApi.members), acá pedidos por esta pantalla porque el muro puede ser lo primero
  // que se abre sin haber pasado antes por Inicio.
  useEffect(() => {
    if (!activeCommunity || activeCommunity.id === rosterLoadedFor) return;
    let cancelled = false;
    communitiesApi
      .members(activeCommunity.id, 0, 30)
      .then((res) => {
        if (cancelled) return;
        setRosterMembers(res.items);
        setRosterLoadedFor(activeCommunity.id);
      })
      .catch((error) => {
        console.warn("[menzo/web] load community roster failed", error);
        if (!cancelled) setRosterLoadedFor(activeCommunity.id);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCommunity, rosterLoadedFor]);

  const liveRooms = state.social.rooms.filter((r) => r.type === "public" && r.live);
  const onlineMembersList = rosterMembers.filter((m) => m.user.isOnline).slice(0, 8);

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
  const allPosts = postsByAuthor(state.social, user.id);
  const posts = allPosts.filter((p) => p.type !== "blog");
  const blogs = allPosts.filter((p) => p.type === "blog");
  const wall = wallMessagesForProfile(state.social, user.id);

  async function handleMessage() {
    if (openingChat) return;
    setOpeningChat(true);
    const roomId = await actions.openDirectMessage(user!.id);
    setOpeningChat(false);
    if (roomId) router.push(`/chat/${roomId}`);
  }

  const hasBackground = !!(user.backgroundUri || user.backgroundColor);
  const canManageTitles = state.profile?.globalRole === "LEADER" || state.profile?.globalRole === "MASTER";

  // El panel derecho solo existe con una comunidad activa (ver más abajo) — sin ella, la columna
  // no debe quedar igual de angosta con medio viewport vacío al lado (mismo bug que /chat/[id]
  // con salas directas).
  const memberColumnWidthClass = activeCommunity ? "lg:mx-0 lg:max-w-[720px] lg:flex-1" : "lg:mx-auto lg:max-w-3xl lg:flex-1";

  const content = (
    <div className="flex w-full flex-col gap-6 px-4 py-6 md:px-8 lg:flex-row lg:items-start lg:gap-6">
    <div className={`mx-auto w-full max-w-2xl ${memberColumnWidthClass}`}>
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
        <BackIcon size={20} />
        Volver
      </button>

      <ProfileHero
        user={user}
        canManageTitles={canManageTitles}
        onAddTitle={(text, color) => actions.addUserTitle(user.id, text, color)}
        onRemoveTitle={(title) => actions.removeUserTitle(user.id, title.id)}
        nameBadge={
          isFriend ? (
            <span className="rounded-full bg-[var(--color-surface-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--color-cyan)]">Amigos</span>
          ) : (
            !isFollowing &&
            followsMe && (
              <span className="rounded-full bg-[var(--color-surface-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">Te sigue</span>
            )
          )
        }
        actions={
          <>
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
          </>
        }
      />

      <div className="menzo-panel mt-4 grid grid-cols-4 gap-2 py-4 text-center">
        <Stat value={user.reputation} label="Reputación" />
        <Stat value={user.following} label="Siguiendo" href={`/connections/${user.id}/following`} />
        <Stat value={user.followers} label="Seguidores" href={`/connections/${user.id}/followers`} />
        <Stat value={user.visitors} label="Visitantes" />
      </div>
      <p className="mt-2 text-center text-xs text-[var(--color-text-muted)] lg:text-left">Miembro desde {formatJoinDate(user.joinedAt)}</p>

      <div className="mt-6">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "posts", label: "Publicaciones" },
            { value: "wall", label: "Muro" },
            { value: "blogs", label: "Blogs" },
          ]}
        />
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

        {tab === "blogs" &&
          (blogs.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">{user.displayName} todavía no ha escrito ningún blog.</p>
          ) : (
            blogs.map((post) => <PostCard key={post.id} post={post} />)
          ))}
      </div>
    </div>

    {activeCommunity && (
      <ContextSidebar>
        {tab === "wall" && (
          <ContextSidebarSection title="Acerca de este muro">
            <p className="text-xs text-[var(--color-text-secondary)]">
              Este es el muro público de {user.displayName}. Los miembros de la comunidad pueden dejar mensajes,
              saludos y recomendaciones. Sé respetuoso y disfruta del espacio.
            </p>
          </ContextSidebarSection>
        )}

        <ContextSidebarSection title="Comunidad">
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2">
              <p className="font-bold">{activeCommunity.memberCount.toLocaleString("es-ES")}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">Miembros</p>
            </div>
            <div className="rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2">
              <p className="font-bold">{activeCommunityDetail?.onlineMemberCount ?? "—"}</p>
              <p className="text-[11px] text-[var(--color-text-muted)]">En línea</p>
            </div>
          </div>
        </ContextSidebarSection>

        {liveRooms.length > 0 && (
          <ContextSidebarSection title="Salas en vivo" icon={<LiveIcon size={16} className="text-[var(--color-coral)]" />}>
            <LiveRoomsCarousel rooms={liveRooms} />
          </ContextSidebarSection>
        )}

        <ContextSidebarSection title="En línea ahora" icon={<UsersIcon size={16} />}>
          {onlineMembersList.length === 0 ? (
            <p className="text-xs text-[var(--color-text-muted)]">Nadie en línea todavía.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {onlineMembersList.map((member) => (
                <Link key={member.user.id} href={`/member/${member.user.id}`} title={member.user.displayName}>
                  <Avatar
                    name={member.user.displayName}
                    avatarUri={member.user.avatarUri ?? undefined}
                    gradient={toGradient(member.user.avatarGradient)}
                    size={36}
                    showOnline
                    online
                  />
                </Link>
              ))}
            </div>
          )}
        </ContextSidebarSection>
      </ContextSidebar>
    )}
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
