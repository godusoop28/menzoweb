"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";

import {
  authApi,
  chatApi,
  clearSession,
  ensureUploaded,
  getCachedSession,
  getMyRealId,
  loadSession,
  mapChatRoom,
  mapMessage,
  mapPost,
  mapUserProfile,
  mapUserSummary,
  onSessionExpired,
  postsApi,
  saveSession,
  usersApi,
} from "@/lib/api";
import type { ChatRoom, UserProfile } from "@/lib/types";

import { LOCAL_USER_ID } from "./store/localUser";
import { appReducer, createDefaultState } from "./store/reducer";
import { getItem, removeItem, setItem, StorageKeys } from "./storage";
import type { AppState, OnboardingPayload, SocialState } from "./store/types";

type AppStateContextValue = {
  state: AppState;
  actions: {
    register: (email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<boolean>;
    completeOnboarding: (payload: OnboardingPayload) => Promise<void>;
    updateProfile: (payload: Partial<UserProfile>, files?: { avatar?: File; cover?: File }) => Promise<void>;
    refreshProfile: () => Promise<void>;
    logout: () => Promise<void>;
    toggleLike: (postId: string) => void;
    toggleBookmark: (postId: string) => void;
    createPost: (body: string, title?: string) => Promise<void>;
    sendMessage: (roomId: string, body: string) => Promise<void>;
    loadRoomMessages: (roomId: string) => Promise<void>;
    createRoom: (payload: { name: string; description?: string; topic?: string }) => Promise<string | null>;
    toggleFavoriteRoom: (roomId: string) => void;
    refreshSocial: () => Promise<void>;
  };
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function hasSession() {
  return !!getCachedSession();
}

async function fetchInitialSocialSnapshot(myRealId: string, profile: UserProfile): Promise<Partial<SocialState>> {
  const [postsPage, rooms] = await Promise.all([
    postsApi.list(0, 20).catch(() => null),
    chatApi.rooms().catch(() => []),
  ]);

  const userMap = new Map<string, ReturnType<typeof mapUserSummary>>();
  userMap.set(profile.id, { ...profile, activityStatus: profile.statusText });
  if (postsPage) {
    for (const dto of postsPage.items) {
      const u = mapUserSummary(dto.author, myRealId);
      if (!userMap.has(u.id)) userMap.set(u.id, u);
    }
  }

  return {
    users: Array.from(userMap.values()),
    posts: postsPage ? postsPage.items.map((dto) => mapPost(dto, myRealId)) : [],
    rooms: rooms.map((dto) => mapChatRoom(dto, myRealId)),
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, createDefaultState());
  const hasHydrated = useRef(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const localProfile = getItem<AppState["profile"]>(StorageKeys.profile);
      const localOnboarding = getItem<boolean>(StorageKeys.onboarding);
      const session = loadSession();

      const base = createDefaultState();
      let next: AppState = {
        isHydrated: true,
        profile: localProfile ?? base.profile,
        onboardingCompleted: localOnboarding ?? false,
        social: base.social,
      };

      if (session) {
        try {
          const meDto = await usersApi.me();
          const profile = mapUserProfile(meDto, session.userId);
          const snapshot = await fetchInitialSocialSnapshot(session.userId, profile);
          next = {
            ...next,
            profile,
            onboardingCompleted: localOnboarding ?? true,
            social: { ...next.social, ...snapshot },
          };
        } catch (error) {
          console.warn("[menzo/api] no se pudo restaurar la sesión", error);
          clearSession();
          next = { ...next, profile: null, onboardingCompleted: false };
        }
      }

      if (!cancelled) {
        dispatch({ type: "HYDRATE", payload: next });
        hasHydrated.current = true;
      }
    }

    hydrate().catch((error) => {
      console.warn("[menzo/store] hydration failed, using defaults", error);
      if (!cancelled) {
        dispatch({ type: "HYDRATE", payload: { ...createDefaultState(), isHydrated: true } });
        hasHydrated.current = true;
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated.current) return;
    setItem(StorageKeys.profile, state.profile);
  }, [state.profile]);

  useEffect(() => {
    if (!hasHydrated.current) return;
    setItem(StorageKeys.onboarding, state.onboardingCompleted);
  }, [state.onboardingCompleted]);

  useEffect(() => {
    if (!state.isHydrated || !state.profile) return;
    function beat() {
      if (!hasSession()) return;
      usersApi.heartbeat().catch((error) => console.warn("[menzo/api] heartbeat failed", error));
    }
    beat();
    const interval = setInterval(beat, 60_000);
    return () => clearInterval(interval);
  }, [state.isHydrated, state.profile]);

  useEffect(() => {
    return onSessionExpired(() => {
      removeItem(StorageKeys.profile);
      removeItem(StorageKeys.onboarding);
      dispatch({ type: "LOGOUT" });
    });
  }, []);

  const actions = useMemo<AppStateContextValue["actions"]>(() => {
    async function register(email: string, password: string) {
      const res = await authApi.register({ email, password });
      saveSession({ accessToken: res.accessToken, refreshToken: res.refreshToken, userId: res.profile.id });
      const profile = mapUserProfile(res.profile, res.profile.id);
      dispatch({ type: "SET_SESSION", payload: { profile, onboardingCompleted: res.onboardingCompleted } });
    }

    async function login(email: string, password: string) {
      const res = await authApi.login({ email, password });
      saveSession({ accessToken: res.accessToken, refreshToken: res.refreshToken, userId: res.profile.id });
      const profile = mapUserProfile(res.profile, res.profile.id);
      dispatch({ type: "SET_SESSION", payload: { profile, onboardingCompleted: res.onboardingCompleted } });
      if (res.onboardingCompleted) {
        try {
          const snapshot = await fetchInitialSocialSnapshot(res.profile.id, profile);
          dispatch({ type: "SET_SOCIAL_BULK", payload: snapshot });
        } catch (error) {
          console.warn("[menzo/api] no se pudo cargar el contenido inicial", error);
        }
      }
      return res.onboardingCompleted;
    }

    async function completeOnboarding(payload: OnboardingPayload) {
      const avatarUri = await ensureUploaded(payload.avatarUri, payload.avatarFile);
      const dto = await usersApi.onboarding({
        displayName: payload.displayName,
        aura: payload.aura,
        avatarUri: avatarUri ?? null,
        avatarGradient: payload.avatarGradient,
        interests: payload.interests,
      });
      const myRealId = getCachedSession()?.userId ?? dto.id;
      const profile = mapUserProfile(dto, myRealId);
      dispatch({ type: "SET_SESSION", payload: { profile, onboardingCompleted: true } });
    }

    async function updateProfile(payload: Partial<UserProfile>, files?: { avatar?: File; cover?: File }) {
      dispatch({ type: "UPDATE_PROFILE", payload });
      if (!hasSession()) return;
      const avatarUri =
        payload.avatarUri !== undefined ? await ensureUploaded(payload.avatarUri, files?.avatar) : undefined;
      const coverUri =
        payload.coverUri !== undefined ? await ensureUploaded(payload.coverUri, files?.cover) : undefined;
      const dto = await usersApi.updateMe({
        displayName: payload.displayName,
        avatarUri,
        avatarGradient: payload.avatarGradient,
        coverUri,
        aura: payload.aura,
        bio: payload.bio,
        statusText: payload.statusText,
        interests: payload.interests,
      });
      const profile = mapUserProfile(dto, getMyRealId());
      dispatch({ type: "SET_SESSION", payload: { profile, onboardingCompleted: true } });
    }

    async function refreshProfile() {
      if (!hasSession()) return;
      const myRealId = getMyRealId();
      const dto = await usersApi.me();
      const profile = mapUserProfile(dto, myRealId);
      dispatch({ type: "SET_SESSION", payload: { profile, onboardingCompleted: true } });
    }

    function toggleLike(postId: string) {
      const wasLiked = stateRef.current.social.posts.find((p) => p.id === postId)?.likes.includes(LOCAL_USER_ID) ?? false;
      dispatch({ type: "TOGGLE_LIKE", payload: { postId } });
      if (!hasSession()) return;
      const call = wasLiked ? postsApi.unlike(postId) : postsApi.like(postId);
      call.catch((error) => console.warn("[menzo/api] toggleLike failed", error));
    }

    function toggleBookmark(postId: string) {
      const wasSaved =
        stateRef.current.social.posts.find((p) => p.id === postId)?.bookmarkedBy.includes(LOCAL_USER_ID) ?? false;
      dispatch({ type: "TOGGLE_BOOKMARK", payload: { postId } });
      if (!hasSession()) return;
      const call = wasSaved ? postsApi.unbookmark(postId) : postsApi.bookmark(postId);
      call.catch((error) => console.warn("[menzo/api] toggleBookmark failed", error));
    }

    async function createPost(body: string, title?: string) {
      if (!hasSession()) throw new Error("No hay sesión activa");
      const dto = await postsApi.create({ type: "text", title, body, tags: [] });
      dispatch({ type: "CREATE_POST", payload: mapPost(dto, getMyRealId()) });
    }

    async function sendMessage(roomId: string, body: string) {
      if (!hasSession()) return;
      const dto = await chatApi.sendMessage(roomId, { body });
      dispatch({ type: "SEND_MESSAGE", payload: mapMessage(dto, getMyRealId()) });
    }

    async function loadRoomMessages(roomId: string) {
      try {
        const page = await chatApi.messages(roomId, 0, 60);
        const myRealId = getMyRealId();
        const users = page.items.filter((m) => m.author).map((m) => mapUserSummary(m.author!, myRealId));
        dispatch({ type: "MERGE_SOCIAL", payload: { messages: page.items.map((dto) => mapMessage(dto, myRealId)), users } });
      } catch (error) {
        console.warn("[menzo/api] loadRoomMessages failed", error);
      }
    }

    async function createRoom(payload: { name: string; description?: string; topic?: string }): Promise<string | null> {
      if (!hasSession()) return null;
      try {
        const dto = await chatApi.createRoom(payload);
        const room: ChatRoom = mapChatRoom(dto, getMyRealId());
        dispatch({ type: "MERGE_SOCIAL", payload: { rooms: [room] } });
        return room.id;
      } catch (error) {
        console.warn("[menzo/api] createRoom failed", error);
        return null;
      }
    }

    function toggleFavoriteRoom(roomId: string) {
      const wasFavorite = stateRef.current.social.rooms.find((r) => r.id === roomId)?.favorite ?? false;
      dispatch({ type: "TOGGLE_FAVORITE_ROOM", payload: { roomId } });
      if (!hasSession()) return;
      const call = wasFavorite ? chatApi.unfavorite(roomId) : chatApi.favorite(roomId);
      call.catch((error) => console.warn("[menzo/api] toggleFavoriteRoom failed", error));
    }

    async function refreshSocial() {
      const session = getCachedSession();
      const profile = stateRef.current.profile;
      if (!session || !profile) return;
      try {
        const snapshot = await fetchInitialSocialSnapshot(session.userId, profile);
        dispatch({ type: "SET_SOCIAL_BULK", payload: snapshot });
      } catch (error) {
        console.warn("[menzo/api] refreshSocial failed", error);
      }
    }

    async function logout() {
      const session = getCachedSession();
      if (session) authApi.logout({ refreshToken: session.refreshToken }).catch(() => {});
      clearSession();
      removeItem(StorageKeys.profile);
      removeItem(StorageKeys.onboarding);
      dispatch({ type: "LOGOUT" });
    }

    return {
      register,
      login,
      completeOnboarding,
      updateProfile,
      refreshProfile,
      logout,
      toggleLike,
      toggleBookmark,
      createPost,
      sendMessage,
      loadRoomMessages,
      createRoom,
      toggleFavoriteRoom,
      refreshSocial,
    };
  }, []);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within an AppStateProvider");
  return ctx;
}

export { LOCAL_USER_ID };
