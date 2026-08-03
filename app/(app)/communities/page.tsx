"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { communitiesApi } from "@/lib/api";
import type { CommunitySummaryDto } from "@/lib/api/types";
import { CommunityBadge } from "@/components/communities/CommunitySwitcher";
import { CompassIcon } from "@/components/icons";
import { useCommunity } from "@/lib/communities/CommunityContext";

/** Explorar comunidades — ver Contexto §9 del pedido. Versión mínima de Fase A/B: lista +
 * unirse/abandonar. Categorías, destacadas, búsqueda avanzada y la pantalla de detalle previa a
 * unirse quedan para cuando el resto de Fase B se construya (blogs/feed/chats por comunidad). */
export default function CommunitiesExplorePage() {
  const router = useRouter();
  const { memberships, joinCommunity, leaveCommunity, switchCommunity } = useCommunity();
  const [communities, setCommunities] = useState<CommunitySummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    communitiesApi
      .list(0, 50)
      .then((page) => setCommunities(page.items))
      .catch((error) => console.warn("[menzo/web] communities list failed", error))
      .finally(() => setLoading(false));
  }, []);

  const joinedIds = new Set(memberships.map((m) => m.community.id));

  async function handleJoin(id: string) {
    setPendingId(id);
    try {
      await joinCommunity(id);
      router.push("/communities");
    } catch (error) {
      console.warn("[menzo/web] joinCommunity failed", error);
    } finally {
      setPendingId(null);
    }
  }

  async function handleLeave(id: string) {
    setPendingId(id);
    try {
      await leaveCommunity(id);
    } catch (error) {
      console.warn("[menzo/web] leaveCommunity failed", error);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex items-center gap-3">
        <CompassIcon size={28} className="text-[var(--color-orange)]" />
        <div>
          <h1 className="font-display text-2xl font-bold">Explorar comunidades</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Unite a las que te interesen — podés estar en varias a la vez.</p>
        </div>
      </div>

      {loading && <p className="text-sm text-[var(--color-text-muted)]">Cargando…</p>}
      {!loading && communities.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">Todavía no hay comunidades disponibles.</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {communities.map((community) => {
          const joined = joinedIds.has(community.id);
          const isPending = pendingId === community.id;
          return (
            <div
              key={community.id}
              className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4"
            >
              <div className="flex items-center gap-3">
                <CommunityBadge name={community.name} iconUrl={community.iconUrl} color={community.primaryColor} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{community.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {community.memberCount} miembro{community.memberCount === 1 ? "" : "s"}
                    {community.category ? ` · ${community.category}` : ""}
                  </p>
                </div>
              </div>
              {community.shortDescription && (
                <p className="line-clamp-2 text-xs text-[var(--color-text-secondary)]">{community.shortDescription}</p>
              )}
              {joined ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => switchCommunity(community.id)}
                    className="flex-1 rounded-full bg-[var(--color-surface-secondary)] py-2 text-xs font-semibold cursor-pointer"
                  >
                    Ya sos miembro · Cambiar acá
                  </button>
                  <button
                    onClick={() => handleLeave(community.id)}
                    disabled={isPending}
                    className="rounded-full px-3 py-2 text-xs font-semibold text-[var(--color-coral)] disabled:opacity-50 cursor-pointer"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleJoin(community.id)}
                  disabled={isPending}
                  style={{ background: community.primaryColor || "var(--color-coral)" }}
                  className="rounded-full py-2 text-xs font-bold text-white disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? "…" : community.accessType === "OPEN" ? "Unirme" : "Solicitar acceso"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
