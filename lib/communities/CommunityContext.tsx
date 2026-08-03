"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { communitiesApi } from "@/lib/api/endpoints";
import type { CommunitySummaryDto, MyCommunityDto } from "@/lib/api/types";
import { useAppState } from "@/lib/AppStateContext";

const ACTIVE_COMMUNITY_STORAGE_KEY = "menzo.activeCommunityId";

/**
 * Estado global de comunidades (Fase A: solo el andamiaje — selector/onboarding/explorar son
 * Fase B). Vive separado de AppStateContext a propósito: cambiar de comunidad solo debe limpiar
 * cachés *comunitarias* (feed/blogs/chats con communityId, todavía no existen — Fase C), nunca el
 * perfil global, amigos o mensajes privados, que siguen viviendo en AppStateContext sin tocarse.
 */
type CommunityContextValue = {
  activeCommunity: CommunitySummaryDto | null;
  memberships: MyCommunityDto[];
  loading: boolean;
  error: string | null;
  switchCommunity: (communityId: string) => void;
  refreshCommunity: () => Promise<void>;
  joinCommunity: (communityId: string) => Promise<void>;
  leaveCommunity: (communityId: string) => Promise<void>;
};

const CommunityContext = createContext<CommunityContextValue | null>(null);

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { state } = useAppState();
  const [memberships, setMemberships] = useState<MyCommunityDto[]>([]);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!state.profile) return;
    setLoading(true);
    setError(null);
    try {
      const mine = await communitiesApi.my();
      setMemberships(mine);

      // 1) leer última comunidad activa guardada localmente; 2) verificar que la membresía
      // siga activa entre las que acaban de llegar; 3) si no, caer a la primera válida; 4) si no
      // pertenece a ninguna, queda en null (Fase B decide qué mostrar ahí — p. ej. Explorar).
      const stored = window.localStorage.getItem(ACTIVE_COMMUNITY_STORAGE_KEY);
      const stillValid = stored && mine.some((m) => m.community.id === stored);
      const nextActiveId = stillValid ? stored : (mine[0]?.community.id ?? null);
      setActiveCommunityId(nextActiveId);
      if (nextActiveId) {
        window.localStorage.setItem(ACTIVE_COMMUNITY_STORAGE_KEY, nextActiveId);
      } else {
        window.localStorage.removeItem(ACTIVE_COMMUNITY_STORAGE_KEY);
      }
    } catch {
      setError("No pudimos cargar tus comunidades.");
    } finally {
      setLoading(false);
    }
  }, [state.profile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el sistema externo (la API) apenas hay perfil; load() ya está detrás de un guard sobre state.profile.
    load();
  }, [load]);

  const switchCommunity = useCallback(
    (communityId: string) => {
      if (!memberships.some((m) => m.community.id === communityId)) return;
      setActiveCommunityId(communityId);
      window.localStorage.setItem(ACTIVE_COMMUNITY_STORAGE_KEY, communityId);
    },
    [memberships]
  );

  const joinCommunity = useCallback(
    async (communityId: string) => {
      await communitiesApi.join(communityId);
      await load();
      switchCommunity(communityId);
    },
    [load, switchCommunity]
  );

  const leaveCommunity = useCallback(
    async (communityId: string) => {
      await communitiesApi.leave(communityId);
      if (activeCommunityId === communityId) {
        window.localStorage.removeItem(ACTIVE_COMMUNITY_STORAGE_KEY);
        setActiveCommunityId(null);
      }
      await load();
    },
    [activeCommunityId, load]
  );

  const activeCommunity = useMemo(
    () => memberships.find((m) => m.community.id === activeCommunityId)?.community ?? null,
    [memberships, activeCommunityId]
  );

  const value = useMemo<CommunityContextValue>(
    () => ({
      activeCommunity,
      memberships,
      loading,
      error,
      switchCommunity,
      refreshCommunity: load,
      joinCommunity,
      leaveCommunity,
    }),
    [activeCommunity, memberships, loading, error, switchCommunity, load, joinCommunity, leaveCommunity]
  );

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be used within a CommunityProvider");
  return ctx;
}
