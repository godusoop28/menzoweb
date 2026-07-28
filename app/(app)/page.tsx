"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ChatRoomListItem } from "@/components/ChatRoomListItem";
import { CommunityHero } from "@/components/CommunityHero";
import { CreatePostComposer } from "@/components/CreatePostComposer";
import { FeaturedPostCard } from "@/components/FeaturedPostCard";
import { PostCard } from "@/components/PostCard";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useAppState } from "@/lib/AppStateContext";
import { featuredPosts, onlineUsers, recentPosts } from "@/lib/store/selectors";

type HomeTab = "recientes" | "destacados" | "hangout";

export default function FeedPage() {
  const { state, actions } = useAppState();
  const [tab, setTab] = useState<HomeTab>("recientes");
  const [refreshing, setRefreshing] = useState(false);

  const posts = recentPosts(state.social);
  const featured = featuredPosts(state.social);
  const onlineMembers = onlineUsers(state.social);

  const favoriteRooms = useMemo(() => state.social.rooms.filter((r) => r.favorite), [state.social.rooms]);
  const directRooms = useMemo(
    () => state.social.rooms.filter((r) => !r.favorite && r.type === "direct"),
    [state.social.rooms]
  );
  const publicRooms = useMemo(
    () => state.social.rooms.filter((r) => !r.favorite && r.type === "public"),
    [state.social.rooms]
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await actions.refreshSocial();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
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

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "recientes", label: "Recientes" },
          { value: "destacados", label: "Destacados" },
          { value: "hangout", label: "Hangout" },
        ]}
      />

      {tab === "recientes" && (
        <>
          <CreatePostComposer />
          <div className="flex flex-col gap-4">
            {posts.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no hay publicaciones.</p>
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
                <span className="text-xs font-semibold uppercase tracking-wide text-white/85">El reencuentro brilla más aquí</span>
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
              <h3 className="font-display text-lg font-bold">Recuerdos que regresaron</h3>
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

      {tab === "hangout" && (
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">Hangout</h2>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Entra, escucha y vuelve a formar parte de la conversación.
              </p>
            </div>
            <Link
              href="/chat"
              className="shrink-0 rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium whitespace-nowrap"
            >
              Crear sala
            </Link>
          </div>

          {favoriteRooms.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Favoritos</h3>
              <div className="flex flex-col gap-2">
                {favoriteRooms.map((room) => (
                  <ChatRoomListItem key={room.id} room={room} />
                ))}
              </div>
            </div>
          )}

          {directRooms.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Mensajes directos</h3>
              <div className="flex flex-col gap-2">
                {directRooms.map((room) => (
                  <ChatRoomListItem key={room.id} room={room} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Salas públicas</h3>
            {publicRooms.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">No hay salas activas. Enciende la primera.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {publicRooms.map((room) => (
                  <ChatRoomListItem key={room.id} room={room} />
                ))}
              </div>
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
