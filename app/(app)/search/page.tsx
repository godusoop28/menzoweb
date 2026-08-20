"use client";

import { useEffect, useMemo, useState } from "react";

import { communitiesApi } from "@/lib/api/endpoints";
import type { CommunitySummaryDto } from "@/lib/api/types";
import { ChatRoomListItem } from "@/components/ChatRoomListItem";
import { CommunityBadge } from "@/components/communities/CommunitySwitcher";
import { MemberCard } from "@/components/MemberCard";
import { PostCard } from "@/components/PostCard";
import { useCommunity } from "@/lib/communities/CommunityContext";
import { useAppState } from "@/lib/AppStateContext";
import { matchesQuery } from "@/lib/search";

// Comunidades no viven en AppStateContext (a diferencia de miembros/posts/salas, que ya están en
// memoria) — se buscan contra /api/communities/discover con debounce, mismo criterio que
// menzomovil/lib/features/search/search_screen.dart.
function useCommunitySearch(query: string) {
  const [results, setResults] = useState<CommunitySummaryDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia resultados de una búsqueda anterior al borrar el query, mismo criterio que CommunityContext.tsx.
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      communitiesApi
        .discover(trimmed)
        .then((page) => {
          if (!cancelled) setResults(page.items);
        })
        .catch((error) => console.warn("[menzo/web] community search failed", error))
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, loading };
}

export default function SearchPage() {
  const { state, actions } = useAppState();
  const { memberships, joinCommunity, switchCommunity } = useCommunity();
  const [query, setQuery] = useState("");
  const { results: communityResults } = useCommunitySearch(query);
  const [pendingCommunityId, setPendingCommunityId] = useState<string | null>(null);

  const results = useMemo(() => {
    if (!query.trim()) return null;
    const members = state.social.users.filter((u) => matchesQuery(u.displayName, query) || matchesQuery(u.username, query));
    const posts = state.social.posts.filter(
      (p) => matchesQuery(p.body, query) || (p.title && matchesQuery(p.title, query)) || p.tags.some((t) => matchesQuery(t, query))
    );
    const rooms = state.social.rooms.filter(
      (r) => matchesQuery(r.name, query) || matchesQuery(r.topic, query) || matchesQuery(r.description ?? "", query)
    );
    return { members, posts, rooms };
  }, [query, state.social]);

  const joinedIds = new Set(memberships.map((m) => m.community.id));

  async function handleJoinCommunity(id: string) {
    setPendingCommunityId(id);
    try {
      await joinCommunity(id);
    } catch (error) {
      console.warn("[menzo/web] joinCommunity from search failed", error);
    } finally {
      setPendingCommunityId(null);
    }
  }

  const hasResults = results && results.members.length + results.posts.length + results.rooms.length + communityResults.length > 0;

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

      {communityResults.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Comunidades</h2>
          {communityResults.map((community) => {
            const joined = joinedIds.has(community.id);
            const isPending = pendingCommunityId === community.id;
            return (
              <div
                key={community.id}
                className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4"
              >
                <CommunityBadge name={community.name} iconUrl={community.iconUrl} color={community.primaryColor} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{community.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{community.memberCount} miembros</p>
                </div>
                {joined ? (
                  <button
                    onClick={() => switchCommunity(community.id)}
                    className="shrink-0 rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
                  >
                    Cambiar acá
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoinCommunity(community.id)}
                    disabled={isPending}
                    style={{ background: community.primaryColor || "var(--color-orange)" }}
                    className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                  >
                    {isPending ? "…" : community.accessType === "OPEN" ? "Unirme" : "Solicitar"}
                  </button>
                )}
              </div>
            );
          })}
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
