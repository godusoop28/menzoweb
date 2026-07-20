"use client";

import { useMemo, useState } from "react";

import { ChatRoomListItem } from "@/components/ChatRoomListItem";
import { MemberCard } from "@/components/MemberCard";
import { PostCard } from "@/components/PostCard";
import { useAppState } from "@/lib/AppStateContext";
import { matchesQuery } from "@/lib/search";

export default function SearchPage() {
  const { state, actions } = useAppState();
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const members = state.social.users.filter((u) => matchesQuery(u.displayName, query) || matchesQuery(u.username, query));
    const posts = state.social.posts.filter(
      (p) => matchesQuery(p.body, query) || (p.title && matchesQuery(p.title, query)) || p.tags.some((t) => matchesQuery(t, query))
    );
    const rooms = state.social.rooms.filter((r) => matchesQuery(r.name, query) || matchesQuery(r.topic, query) || matchesQuery(r.description, query));
    return { members, posts, rooms };
  }, [query, state.social]);

  const hasResults = results && results.members.length + results.posts.length + results.rooms.length > 0;

  function commitSearch() {
    if (query.trim()) actions.addRecentSearch(query.trim());
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-2.5 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.4)] transition-colors focus-within:border-[var(--color-orange)]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commitSearch()}
          placeholder="Busca miembros, publicaciones, salas o tags"
          autoFocus
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]"
        />
        {!!query && (
          <button onClick={() => setQuery("")} className="text-sm text-[var(--color-cyan)] cursor-pointer">
            Limpiar
          </button>
        )}
      </div>

      {!query.trim() && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Búsquedas recientes</h2>
          {state.social.recentSearches.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Aún no has buscado nada.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {state.social.recentSearches.map((item) => (
                <button
                  key={item}
                  onClick={() => setQuery(item)}
                  className="rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] cursor-pointer"
                >
                  {item}
                </button>
              ))}
              <button onClick={actions.clearRecentSearches} className="text-xs text-[var(--color-cyan)] cursor-pointer">
                Borrar historial
              </button>
            </div>
          )}
        </div>
      )}

      {results && !hasResults && <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">No encontramos nada con ese nombre.</p>}

      {results && results.members.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Miembros</h2>
          {results.members.map((user) => (
            <MemberCard key={user.id} user={user} />
          ))}
        </div>
      )}

      {results && results.rooms.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Salas</h2>
          {results.rooms.map((room) => (
            <ChatRoomListItem key={room.id} room={room} />
          ))}
        </div>
      )}

      {results && results.posts.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Publicaciones</h2>
          {results.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
