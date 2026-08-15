"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ChatRoomListItem } from "@/components/ChatRoomListItem";
import { CommunityHero } from "@/components/CommunityHero";
import { CreatePostComposer } from "@/components/CreatePostComposer";
import { FeaturedPostCard } from "@/components/FeaturedPostCard";
import { LiveRoomsCarousel } from "@/components/LiveRoomsCarousel";
import { PostCard } from "@/components/PostCard";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { communityFallbackGradient } from "@/lib/communities/backgroundStyle";
import { useCommunity } from "@/lib/communities/CommunityContext";
import { featuredPosts, onlineUsers, recentPosts } from "@/lib/store/selectors";

type HomeTab = "recientes" | "destacados" | "descubrir";
type RoomSort = "recent" | "popular";

export default function FeedPage() {
  const { state, actions } = useAppState();
  const accent = useAccent();
  const { activeCommunity, activeCommunityDetail } = useCommunity();
  const feedBackgroundUrl = activeCommunityDetail?.themeConfig?.feedBackgroundUrl || activeCommunityDetail?.backgroundUrl;
  const feedFallbackGradient = communityFallbackGradient(activeCommunity);
  const [tab, setTab] = useState<HomeTab>("recientes");
  const [refreshing, setRefreshing] = useState(false);
  const [roomSort, setRoomSort] = useState<RoomSort>("recent");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const posts = recentPosts(state.social);
  const featured = featuredPosts(state.social);
  const onlineMembers = onlineUsers(state.social);

  useEffect(() => {
    if (tab === "descubrir") actions.loadDiscoverRooms(roomSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, roomSort]);

  useEffect(() => {
    actions.loadLiveRooms();
    const interval = setInterval(() => actions.loadLiveRooms(), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveRooms = useMemo(() => state.social.rooms.filter((r) => r.type === "public" && r.live), [state.social.rooms]);

  const discoverRooms = useMemo(() => {
    const publicRooms = state.social.rooms.filter((r) => r.type === "public");
    const sorted = [...publicRooms].sort((a, b) =>
      roomSort === "popular"
        ? b.onlineCount - a.onlineCount
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return sorted;
  }, [state.social.rooms, roomSort]);

  async function handleJoin(roomId: string) {
    setJoiningId(roomId);
    try {
      await actions.joinRoom(roomId);
    } finally {
      setJoiningId(null);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await actions.refreshSocial();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div
      className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8"
      style={
        feedBackgroundUrl || feedFallbackGradient
          ? {
              backgroundImage: [
                "linear-gradient(rgba(7,9,13,0.88), rgba(7,9,13,0.88))",
                feedBackgroundUrl ? `url(${feedBackgroundUrl})` : null,
                feedFallbackGradient,
              ]
                .filter(Boolean)
                .join(", "),
              backgroundSize: "cover",
              backgroundPosition: "top center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      <div className="menzo-fade-in flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">
            Bienvenido de vuelta, <span className="text-[var(--color-orange)]">{state.profile?.displayName}</span>
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Hay nuevas historias esperándote.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-full border border-[var(--color-border-soft)] px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-50 cursor-pointer"
        >
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      <CommunityHero previewMembers={onlineMembers} />

      <LiveRoomsCarousel rooms={liveRooms} />

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "recientes", label: "Recientes" },
          { value: "destacados", label: "Destacados" },
          { value: "descubrir", label: "Descubrir" },
        ]}
      />

      {tab === "recientes" && (
        <>
          <CreatePostComposer />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {posts.length === 0 ? (
              <p className="col-span-full py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no hay publicaciones.</p>
            ) : (
              posts.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        </>
      )}

      {tab === "destacados" &&
        (featured.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Nada destacado todavía.</p>
        ) : (
          <div className="flex flex-col gap-6">
            <div
              className="relative flex h-36 flex-col justify-end overflow-hidden rounded-2xl bg-cover bg-center p-5"
              style={{ backgroundImage: "url(/banners/banner-featured.png)" }}
            >
              <div className="absolute inset-0 bg-[rgba(7,9,13,0.3)]" />
              <div className="relative flex flex-col gap-0.5 text-white">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/85">Lo mejor de la semana</span>
                <h2 className="font-display text-2xl font-bold">Destacados</h2>
              </div>
            </div>

            <FeaturedPostCard post={featured[0]} variant="hero" />
            <div className="grid grid-cols-2 gap-4">
              {featured.slice(1, 3).map((post) => (
                <FeaturedPostCard key={post.id} post={post} />
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-display text-lg font-bold">Elegidos por la comunidad</h3>
              <div className="flex snap-x gap-4 overflow-x-auto pb-1">
                {featured.map((post) => (
                  <div key={`chosen-${post.id}`} className="w-[220px] shrink-0 snap-start">
                    <FeaturedPostCard post={post} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="font-display text-lg font-bold">También te puede interesar</h3>
              <div className="flex snap-x gap-4 overflow-x-auto pb-1">
                {[...featured].reverse().map((post) => (
                  <div key={`memory-${post.id}`} className="w-[220px] shrink-0 snap-start">
                    <FeaturedPostCard post={post} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

      {tab === "descubrir" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">Descubrir salas</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Explora todas las salas públicas y únete a las que te llamen la atención.
              </p>
            </div>
            <Link
              href="/chat"
              style={{ background: accent.color }}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap text-[var(--color-text-on-accent)]"
            >
              + Crear sala
            </Link>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setRoomSort("recent")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium cursor-pointer ${
                roomSort === "recent"
                  ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              Recientes
            </button>
            <button
              onClick={() => setRoomSort("popular")}
              className={`rounded-full px-4 py-1.5 text-xs font-medium cursor-pointer ${
                roomSort === "popular"
                  ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)]"
              }`}
            >
              Populares
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {discoverRooms.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">No hay salas activas. Enciende la primera.</p>
            ) : (
              discoverRooms.map((room) => (
                <ChatRoomListItem key={room.id} room={room} onJoin={handleJoin} joining={joiningId === room.id} />
              ))
            )}
          </div>

          <Link href="/events" className="text-center text-sm font-medium text-[var(--color-cyan)]">
            Ver eventos de la comunidad →
          </Link>
        </div>
      )}
    </div>
  );
}
