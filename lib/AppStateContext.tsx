"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";

import {
  activityApi,
  adminApi,
  ApiError,
  authApi,
  chatApi,
  clearSession,
  ensureUploaded,
  getCachedSession,
  getMyRealId,
  loadSession,
  mapChatRoom,
  mapComment,
  mapDemoUser,
  mapMessage,
  mapNotification,
  mapPost,
  mapUserProfile,
  mapUserSummary,
  mapWallComment,
  mapWallMessage,
  notificationsApi,
  onSessionExpired,
  postsApi,
  saveSession,
  usersApi,
} from "@/lib/api";
import type { ChatRoom, UserProfile } from "@/lib/types";

import { LOCAL_USER_ID } from "./store/localUser";
import { appReducer, createDefaultState } from "./store/reducer";
import { getItem, removeItem, setItem, StorageKeys } from "./storage";
import type { AppState, OnboardingPayload, RecentlyViewedEntry, SocialState } from "./store/types";
import { useToast } from "./ToastContext";

type AppStateContextValue = {
  state: AppState;
  actions: {
    register: (email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<boolean>;
    completeOnboarding: (payload: OnboardingPayload) => Promise<void>;
    updateProfile: (
      payload: Partial<UserProfile>,
      files?: { avatar?: File; cover?: File; background?: File }
    ) => Promise<void>;
    refreshProfile: () => Promise<void>;
    logout: () => Promise<void>;
    toggleLike: (postId: string) => void;
    toggleBookmark: (postId: string) => void;
    createPost: (payload: {
      body: string;
      title?: string;
      tags?: string[];
      imageUri?: string;
      imageFile?: File;
      pollOptions?: string[];
      blocks?: import("@/lib/api/types").PostBlockDto[];
      /** Override explícito — sin esto, el tipo se infiere del contenido (poll/image/text), ver
       * implementación. Usado por el compositor de blogs para forzar "blog". */
      postType?: import("@/lib/api/types").PostType;
      nsfw?: boolean;
    }) => Promise<void>;
    updatePost: (postId: string, payload: { title?: string; blocks: import("@/lib/api/types").PostBlockDto[]; reason?: string }) => Promise<void>;
    deletePost: (postId: string, reason?: string) => Promise<void>;
    leaveOrDeleteRoom: (roomId: string, isOwner: boolean) => Promise<void>;
    sendMessage: (roomId: string, body: string, replyToMessageId?: string, stickerId?: string) => Promise<void>;
    deleteMessage: (roomId: string, messageId: string, reason?: string) => Promise<void>;
    toggleReaction: (roomId: string, messageId: string, emoji: string) => Promise<void>;
    loadRoomMessages: (roomId: string) => Promise<void>;
    receiveRoomMessage: (dto: import("@/lib/api").MessageDto) => void;
    createRoom: (payload: { name: string; description?: string; topic?: string; category?: string }) => Promise<string | null>;
    toggleFavoriteRoom: (roomId: string) => void;
    joinRoom: (roomId: string) => Promise<void>;
    loadDiscoverRooms: (sort?: "recent" | "popular") => Promise<void>;
    loadLiveRooms: () => Promise<void>;
    updateRoomSettings: (
      roomId: string,
      patch: import("@/lib/api").UpdateRoomRequest,
      files?: { avatar?: File; cover?: File; background?: File }
    ) => Promise<void>;
    /** Un ChatRoomUpdated/AppearanceUpdated empujado por WebSocket — MERGE_SOCIAL ya reemplaza por id. */
    receiveRoomUpdate: (room: ChatRoom) => void;
    refreshSocial: () => Promise<void>;
    ensurePostLoaded: (postId: string) => Promise<void>;
    loadPostComments: (postId: string) => Promise<void>;
    addComment: (postId: string, body: string) => void;
    votePoll: (postId: string, optionId: string) => Promise<void>;
    ensureUserLoaded: (userId: string) => Promise<void>;
    refreshUser: (userId: string) => Promise<void>;
    addUserTitle: (profileId: string, text: string, color: string) => Promise<void>;
    removeUserTitle: (profileId: string, titleId: string) => Promise<void>;
    loadProfileWall: (profileId: string) => Promise<void>;
    addWallMessage: (profileId: string, body: string, imageUri?: string, imageFile?: File) => Promise<void>;
    loadWallComments: (wallMessageId: string, page?: number) => Promise<{ hasNext: boolean } | null>;
    addWallComment: (
      wallMessageId: string,
      body: string,
      options?: { imageUri?: string; imageFile?: File; parentCommentId?: string }
    ) => Promise<void>;
    deleteWallComment: (commentId: string, wallMessageId: string) => Promise<void>;
    receiveWallComment: (dto: import("@/lib/api").WallCommentDto) => void;
    removeWallComment: (commentId: string, wallMessageId: string) => void;
    toggleWallCommentLike: (commentId: string, wallMessageId: string) => Promise<void>;
    toggleFollow: (userId: string) => void;
    openDirectMessage: (userId: string) => Promise<string | null>;
    loadNotifications: () => Promise<void>;
    markNotificationRead: (id: string) => void;
    markAllNotificationsRead: () => void;
    addRecentlyViewed: (entry: RecentlyViewedEntry) => void;
    addRecentSearch: (query: string) => void;
    clearRecentSearches: () => void;
  };
};

const AppStateContext = createContext<AppStateContextValue | null>(null);

function hasSession() {
  return !!getCachedSession();
}

/** communityId opcional: sin él trae todo sin filtrar (compatibilidad); con él, posts/salas
 * PUBLIC quedan acotados a esa comunidad — nunca se mezcla contenido de una comunidad con otra
 * (ver Contexto §11/§21 del pedido original). Los DM (salas DIRECT) el backend los devuelve
 * siempre, sin importar communityId. */
async function fetchInitialSocialSnapshot(
  myRealId: string,
  profile: UserProfile,
  communityId?: string | null
): Promise<Partial<SocialState>> {
  const [postsPage, rooms, notificationsPage, following, membersPage] = await Promise.all([
    postsApi.list(communityId ?? undefined, 0, 20).catch(() => null),
    chatApi.rooms(communityId ?? undefined).catch(() => []),
    notificationsApi.list(0, 30).catch(() => null),
    usersApi.following(myRealId).catch(() => []),
    usersApi.search("", 0, 60).catch(() => null),
  ]);

  const userMap = new Map<string, ReturnType<typeof mapUserSummary>>();
  userMap.set(profile.id, { ...profile, activityStatus: profile.statusText });
  if (postsPage) {
    for (const dto of postsPage.items) {
      const u = mapUserSummary(dto.author, myRealId);
      if (!userMap.has(u.id)) userMap.set(u.id, u);
    }
  }
  for (const dto of following) {
    if (!userMap.has(dto.id)) userMap.set(dto.id, { ...mapUserProfile(dto, myRealId), activityStatus: dto.statusText ?? "" });
  }
  if (membersPage) {
    for (const dto of membersPage.items) {
      if (!userMap.has(dto.id)) userMap.set(dto.id, { ...mapUserProfile(dto, myRealId), activityStatus: dto.statusText ?? "" });
    }
  }

  return {
    users: Array.from(userMap.values()),
    posts: postsPage ? postsPage.items.map((dto) => mapPost(dto, myRealId)) : [],
    rooms: rooms.map((dto) => mapChatRoom(dto, myRealId)),
    notifications: notificationsPage ? notificationsPage.items.map((dto) => mapNotification(dto, myRealId)) : [],
    following: following.map((dto) => dto.id),
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, createDefaultState());
  const hasHydrated = useRef(false);
  const stateRef = useRef(state);
  const showToast = useToast();

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
          const communityId = getItem<string>(StorageKeys.activeCommunityId);
          const snapshot = await fetchInitialSocialSnapshot(session.userId, profile, communityId);
          next = {
            ...next,
            profile,
            onboardingCompleted: localOnboarding ?? true,
            social: { ...next.social, ...snapshot },
          };
        } catch (error) {
          console.warn("[menzo/api] no se pudo restaurar la sesión", error);
          // Solo se descarta la sesión si el backend realmente la rechazó (401/403). Cualquier
          // otro error (red caída, backend de Render despertando, timeout) NO debe desloguear a
          // alguien con tokens válidos — antes cualquier falla acá tiraba la sesión entera, así
          // que un simple corte de señal al abrir la app forzaba un login nuevo. Se mantiene el
          // perfil cacheado en localStorage (ya está en `next` desde arriba) y el efecto de
          // reconexión de más abajo reintenta traer el perfil real + los datos sociales apenas
          // vuelva la conexión o la pestaña recupere foco.
          const isAuthError = error instanceof ApiError && (error.status === 401 || error.status === 403);
          if (isAuthError) {
            clearSession();
            next = { ...next, profile: null, onboardingCompleted: false };
          }
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
          const communityId = getItem<string>(StorageKeys.activeCommunityId);
          const snapshot = await fetchInitialSocialSnapshot(res.profile.id, profile, communityId);
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
        username: payload.username,
        avatarUri: avatarUri ?? null,
        avatarGradient: payload.avatarGradient,
        interests: payload.interests,
        communityIds: payload.communityIds,
      });
      const myRealId = getCachedSession()?.userId ?? dto.id;
      const profile = mapUserProfile(dto, myRealId);
      dispatch({ type: "SET_SESSION", payload: { profile, onboardingCompleted: true } });
    }

    async function updateProfile(
      payload: Partial<UserProfile>,
      files?: { avatar?: File; cover?: File; background?: File }
    ) {
      dispatch({ type: "UPDATE_PROFILE", payload });
      if (!hasSession()) return;
      try {
        await persistProfileUpdate(payload, files);
      } catch (error) {
        // El PATCH falló (p. ej. la pipeline de seguridad rechazó el contenido) — el dispatch
        // optimista de arriba ya mostraba el cambio como aplicado, así que hay que resincronizar
        // con lo que el backend realmente tiene, no dejar al usuario viendo algo que no se guardó.
        refreshProfile().catch(() => undefined);
        throw error;
      }
    }

    async function persistProfileUpdate(
      payload: Partial<UserProfile>,
      files?: { avatar?: File; cover?: File; background?: File }
    ) {
      const avatarUri =
        payload.avatarUri !== undefined ? await ensureUploaded(payload.avatarUri, files?.avatar) : undefined;
      const coverUri =
        payload.coverUri !== undefined ? await ensureUploaded(payload.coverUri, files?.cover) : undefined;
      // "" es la señal explícita de "quitar fondo" — no debe pasar por ensureUploaded, que
      // colapsa cualquier valor vacío/falsy a undefined (= "sin cambios" en el PATCH parcial).
      const backgroundUri =
        payload.backgroundUri !== undefined
          ? payload.backgroundUri === ""
            ? ""
            : await ensureUploaded(payload.backgroundUri, files?.background)
          : undefined;
      const dto = await usersApi.updateMe({
        displayName: payload.displayName,
        username: payload.username,
        avatarUri,
        avatarGradient: payload.avatarGradient,
        coverUri,
        backgroundUri,
        backgroundColor: payload.backgroundColor,
        bubbleColor: payload.bubbleColor,
        bubbleBorderColor: payload.bubbleBorderColor,
        bubbleOpacity: payload.bubbleOpacity,
        bubbleBorderWidth: payload.bubbleBorderWidth,
        bubbleRadius: payload.bubbleRadius,
        bubbleGlowIntensity: payload.bubbleGlowIntensity,
        bio: payload.bio,
        statusText: payload.statusText,
        interests: payload.interests,
        socialLinks: payload.socialLinks,
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

    async function createPost(payload: {
      body: string;
      title?: string;
      tags?: string[];
      imageUri?: string;
      imageFile?: File;
      pollOptions?: string[];
      blocks?: import("@/lib/api/types").PostBlockDto[];
      postType?: import("@/lib/api/types").PostType;
      nsfw?: boolean;
    }) {
      if (!hasSession()) throw new Error("No hay sesión activa");
      const imageUri = await ensureUploaded(payload.imageUri, payload.imageFile);
      // Cada bloque de imagen/gif ya trae su propia URL https (se sube al agregarse en el editor,
      // ver BlockEditor) — acá solo se decide el `type` legacy que sigue pidiendo el backend para
      // posts sin bloques (poll aparte, no usa nada de esto). `postType` (p.ej. "blog") pisa esta
      // inferencia cuando el compositor ya sabe exactamente qué tipo quiere.
      const hasMedia = payload.blocks?.some((b) => b.type === "image" || b.type === "gif") ?? false;
      const dto = await postsApi.create({
        type: payload.postType ?? (payload.pollOptions ? "poll" : hasMedia || imageUri ? "image" : "text"),
        title: payload.title,
        body: payload.body,
        imageUri,
        tags: payload.tags ?? [],
        pollOptions: payload.pollOptions,
        blocks: payload.blocks,
        communityId: getItem<string>(StorageKeys.activeCommunityId) ?? undefined,
        nsfw: payload.nsfw,
      });
      dispatch({ type: "CREATE_POST", payload: mapPost(dto, getMyRealId()) });
    }

    async function updatePost(
      postId: string,
      payload: { title?: string; blocks: import("@/lib/api/types").PostBlockDto[]; reason?: string }
    ) {
      if (!hasSession()) throw new Error("No hay sesión activa");
      const dto = await postsApi.update(postId, { title: payload.title, blocks: payload.blocks, reason: payload.reason });
      dispatch({ type: "MERGE_SOCIAL", payload: { posts: [mapPost(dto, getMyRealId())] } });
    }

    async function deletePost(postId: string, reason?: string) {
      if (!hasSession()) throw new Error("No hay sesión activa");
      await postsApi.remove(postId, reason ? { reason } : undefined);
      dispatch({ type: "REMOVE_POST", payload: { postId } });
    }

    /** Acción rápida desde la lista de chats (ver ChatRoomTile) — no es lo mismo que
     * RoomSettingsPanel.handleDelete (esa exige tipear el nombre exacto, para el caso "estoy
     * administrando la sala"; acá es un swipe/click sobre la fila, así que solo tiene sentido
     * cuando la sala YA está saliendo de la lista, sea porque la abandono o porque de verdad la
     * borro). `isOwner` decide cuál de las dos llamadas hacer — un no-dueño nunca puede pegarle a
     * deleteRoom (el backend lo rechazaría igual, pero ni vale la pena intentarlo). */
    async function leaveOrDeleteRoom(roomId: string, isOwner: boolean) {
      if (!hasSession()) return;
      if (isOwner) await chatApi.deleteRoom(roomId);
      else await chatApi.leave(roomId);
      dispatch({ type: "REMOVE_ROOM", payload: { roomId } });
    }

    async function sendMessage(roomId: string, body: string, replyToMessageId?: string, stickerId?: string) {
      if (!hasSession()) return;
      const dto = await chatApi.sendMessage(roomId, { body: stickerId ? undefined : body, replyToMessageId, stickerId });
      const message = mapMessage(dto, getMyRealId());
      dispatch({ type: "SEND_MESSAGE", payload: message });
      touchRoomLastMessage(roomId, message);
    }

    /** Sin patch optimista local — el propio backend reenvía el mensaje actualizado (deleted:
     * true) por el mismo tópico STOMP que cualquier otra mutación de sala (ver receiveRoomMessage/
     * mergeById), así que la UI se actualiza sola cuando ese evento llega. */
    async function deleteMessage(roomId: string, messageId: string, reason?: string) {
      if (!hasSession()) return;
      await chatApi.deleteMessage(roomId, messageId, reason ? { reason } : undefined);
    }

    /** Mismo criterio que deleteMessage: sin patch optimista, el backend reenvía el mensaje
     * actualizado (con la reacción puesta o quitada) por el mismo tópico STOMP de siempre. */
    async function toggleReaction(roomId: string, messageId: string, emoji: string) {
      if (!hasSession()) return;
      await chatApi.toggleReaction(roomId, messageId, emoji);
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

    /** Un mensaje empujado por WebSocket (propio o ajeno) — MERGE_SOCIAL ya deduplica por id, así
     * que si este mismo mensaje ya se agregó de forma optimista via sendMessage() no se duplica. */
    function receiveRoomMessage(dto: import("@/lib/api").MessageDto) {
      const myRealId = getMyRealId();
      const users = dto.author ? [mapUserSummary(dto.author, myRealId)] : [];
      const message = mapMessage(dto, myRealId);
      dispatch({ type: "MERGE_SOCIAL", payload: { messages: [message], users } });
      touchRoomLastMessage(message.roomId, message);
    }

    /** Mensajes eliminados no pisan la vista previa (dejan lo último realmente visible) — el
     * propio reducer (ver TOUCH_ROOM_LAST_MESSAGE) descarta un mensaje más viejo que el que ya
     * tenía la sala, para que un reenvío/reconexión fuera de orden nunca haga retroceder la
     * fecha. Se lee del reducer, no de `state` cerrado acá arriba — `actions` está memoizado, así
     * que un closure sobre `state` en este componente quedaría con el valor de cuando se creó. */
    function touchRoomLastMessage(roomId: string, message: import("@/lib/types").Message) {
      if (message.deleted) return;
      dispatch({
        type: "TOUCH_ROOM_LAST_MESSAGE",
        payload: {
          roomId,
          lastMessage: {
            body: message.body,
            hasImage: !!message.imageUri,
            senderId: message.authorId,
            createdAt: message.createdAt,
          },
        },
      });
    }

    async function createRoom(payload: {
      name: string;
      description?: string;
      topic?: string;
      category?: string;
    }): Promise<string | null> {
      if (!hasSession()) return null;
      try {
        const communityId = getItem<string>(StorageKeys.activeCommunityId) ?? undefined;
        const dto = await chatApi.createRoom({ ...payload, communityId });
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

    async function joinRoom(roomId: string) {
      if (!hasSession()) return;
      try {
        await chatApi.join(roomId);
        const dto = await chatApi.getRoom(roomId);
        dispatch({ type: "MERGE_SOCIAL", payload: { rooms: [mapChatRoom(dto, getMyRealId())] } });
      } catch (error) {
        console.warn("[menzo/api] joinRoom failed", error);
        showToast("No pudimos unirte a la sala. Inténtalo de nuevo.");
      }
    }

    async function loadDiscoverRooms(sort: "recent" | "popular" = "recent") {
      try {
        const communityId = getItem<string>(StorageKeys.activeCommunityId) ?? undefined;
        const dtos = await chatApi.discover(sort, communityId);
        const myRealId = getMyRealId();
        dispatch({ type: "MERGE_SOCIAL", payload: { rooms: dtos.map((dto) => mapChatRoom(dto, myRealId)) } });
      } catch (error) {
        console.warn("[menzo/api] loadDiscoverRooms failed", error);
      }
    }

    async function loadLiveRooms() {
      try {
        const communityId = getItem<string>(StorageKeys.activeCommunityId) ?? undefined;
        const dtos = await chatApi.liveRooms(communityId);
        const myRealId = getMyRealId();
        dispatch({ type: "MERGE_SOCIAL", payload: { rooms: dtos.map((dto) => mapChatRoom(dto, myRealId)) } });
      } catch (error) {
        console.warn("[menzo/api] loadLiveRooms failed", error);
      }
    }

    /** Sube (si hace falta) y limpia cada campo de imagen: "" es la señal explícita de "quitar
     * imagen" (mismo patrón que backgroundUri en updateProfile) y no debe pasar por
     * ensureUploaded, que colapsa cualquier valor vacío/falsy a undefined (= "sin cambios" en el
     * PATCH parcial); undefined significa "no tocar este campo". */
    async function resolveImageField(uri: string | undefined, file: File | undefined): Promise<string | undefined> {
      if (uri === undefined) return undefined;
      if (uri === "") return "";
      return ensureUploaded(uri, file);
    }

    /** Usado por el panel de configuración (tuerca): un solo PATCH parcial para nombre,
     * descripción, categoría, apariencia, privacidad y permisos — la validación real de quién
     * puede cambiar qué vive en el backend (ChatService.updateRoom), acá solo se arma el payload. */
    async function updateRoomSettings(
      roomId: string,
      patch: import("@/lib/api").UpdateRoomRequest,
      files?: { avatar?: File; cover?: File; background?: File }
    ) {
      if (!hasSession()) throw new Error("No hay sesión activa");
      const [avatarUri, coverUri, backgroundUri] = await Promise.all([
        resolveImageField(patch.avatarUri, files?.avatar),
        resolveImageField(patch.coverUri, files?.cover),
        resolveImageField(patch.backgroundUri, files?.background),
      ]);
      const dto = await chatApi.updateRoom(roomId, { ...patch, avatarUri, coverUri, backgroundUri });
      dispatch({ type: "MERGE_SOCIAL", payload: { rooms: [mapChatRoom(dto, getMyRealId())] } });
    }

    function receiveRoomUpdate(room: ChatRoom) {
      dispatch({ type: "MERGE_SOCIAL", payload: { rooms: [room] } });
    }

    async function refreshSocial() {
      const session = getCachedSession();
      const profile = stateRef.current.profile;
      if (!session || !profile) return;
      try {
        const communityId = getItem<string>(StorageKeys.activeCommunityId);
        const snapshot = await fetchInitialSocialSnapshot(session.userId, profile, communityId);
        dispatch({ type: "SET_SOCIAL_BULK", payload: snapshot });
      } catch (error) {
        console.warn("[menzo/api] refreshSocial failed", error);
      }
    }

    async function ensurePostLoaded(postId: string) {
      if (stateRef.current.social.posts.some((p) => p.id === postId)) return;
      try {
        const dto = await postsApi.getById(postId);
        const myRealId = getMyRealId();
        dispatch({ type: "MERGE_SOCIAL", payload: { posts: [mapPost(dto, myRealId)], users: [mapUserSummary(dto.author, myRealId)] } });
      } catch (error) {
        console.warn("[menzo/api] ensurePostLoaded failed", error);
      }
    }

    async function loadPostComments(postId: string) {
      try {
        const page = await postsApi.comments(postId, 0, 30);
        const myRealId = getMyRealId();
        dispatch({
          type: "MERGE_SOCIAL",
          payload: {
            comments: page.items.map((dto) => mapComment(dto, myRealId)),
            users: page.items.map((dto) => mapUserSummary(dto.author, myRealId)),
          },
        });
      } catch (error) {
        console.warn("[menzo/api] loadPostComments failed", error);
      }
    }

    function addComment(postId: string, body: string) {
      if (!hasSession()) return;
      postsApi
        .addComment(postId, body)
        .then((dto) => dispatch({ type: "ADD_COMMENT", payload: mapComment(dto, getMyRealId()) }))
        .catch((error) => {
          console.warn("[menzo/api] addComment failed", error);
          showToast(error instanceof ApiError ? error.message : "No se pudo publicar el comentario.");
        });
    }

    /** Antes esto actualizaba el estado local de forma optimista (sin esperar al servidor) y
     * descartaba la respuesta real del voto — si la petición fallaba, la UI se quedaba mostrando
     * un voto que nunca se guardó, sin ningún aviso. Ahora no toca el estado global hasta tener la
     * respuesta real del servidor (con los conteos reales), así que nunca hay nada que revertir: el
     * componente que llama a esto mantiene su propio estado de "votando" mientras espera. */
    async function votePoll(postId: string, optionId: string) {
      if (!hasSession()) return;
      const dto = await postsApi.vote(postId, optionId);
      dispatch({ type: "MERGE_SOCIAL", payload: { posts: [mapPost(dto, getMyRealId())] } });
    }

    async function ensureUserLoaded(userId: string) {
      if (userId === LOCAL_USER_ID) return;
      if (stateRef.current.social.users.some((u) => u.id === userId)) return;
      try {
        const dto = await usersApi.getById(userId);
        const myRealId = getMyRealId();
        dispatch({ type: "MERGE_SOCIAL", payload: { users: [{ ...mapUserProfile(dto, myRealId), activityStatus: dto.statusText ?? "" }] } });
      } catch (error) {
        console.warn("[menzo/api] ensureUserLoaded failed", error);
      }
    }

    /** A diferencia de ensureUserLoaded, SIEMPRE pide el perfil de nuevo — ensureUserLoaded se
     * salta el fetch si ese id ya está en social.users, algo intencional para no repetir
     * consultas al mostrar un avatar/nombre suelto (autor de un post, un mensaje), pero incorrecto
     * para la pantalla de perfil en sí: si ese usuario ya había aparecido como autor de cualquier
     * cosa antes de abrir su perfil, la pantalla se quedaba con esos datos livianos/desactualizados
     * (sin sus títulos nuevos, p.ej.) hasta un refresh completo del navegador. */
    async function refreshUser(userId: string) {
      if (userId === LOCAL_USER_ID) return;
      try {
        const dto = await usersApi.getById(userId);
        const myRealId = getMyRealId();
        dispatch({ type: "MERGE_SOCIAL", payload: { users: [mapDemoUser(dto, myRealId)] } });
      } catch (error) {
        console.warn("[menzo/api] refreshUser failed", error);
      }
    }

    /** LEADER+ (el backend re-verifica, ver AdminService.addTitle en menzoapi) — igual criterio
     * de resolución de id que loadProfileWall: profileId puede venir como LOCAL_USER_ID cuando
     * el objetivo es uno mismo, pero el endpoint necesita el UUID real. */
    async function addUserTitle(profileId: string, text: string, color: string) {
      const targetId = profileId === LOCAL_USER_ID ? getMyRealId() : profileId;
      if (!targetId) return;
      const dto = await adminApi.addTitle(targetId, { text, color });
      dispatch({ type: "MERGE_SOCIAL", payload: { users: [mapDemoUser(dto, getMyRealId())] } });
      // Un LEADER puede otorgarse un título a sí mismo (ver AdminService.addTitle) — state.profile
      // vive aparte de social.users (ver profile/page.tsx), así que también hay que refrescarlo.
      if (profileId === LOCAL_USER_ID) await refreshProfile();
    }

    async function removeUserTitle(profileId: string, titleId: string) {
      const targetId = profileId === LOCAL_USER_ID ? getMyRealId() : profileId;
      if (!targetId) return;
      const dto = await adminApi.removeTitle(targetId, titleId);
      dispatch({ type: "MERGE_SOCIAL", payload: { users: [mapDemoUser(dto, getMyRealId())] } });
      if (profileId === LOCAL_USER_ID) await refreshProfile();
    }

    async function loadProfileWall(profileId: string) {
      const targetId = profileId === LOCAL_USER_ID ? getMyRealId() : profileId;
      if (!targetId) return;
      try {
        const page = await usersApi.wall(targetId, 0, 20);
        const myRealId = getMyRealId();
        dispatch({
          type: "MERGE_SOCIAL",
          payload: {
            wallMessages: page.items.map((dto) => mapWallMessage(dto, myRealId)),
            users: page.items.map((dto) => mapUserSummary(dto.author, myRealId)),
          },
        });
      } catch (error) {
        console.warn("[menzo/api] loadProfileWall failed", error);
      }
    }

    async function addWallMessage(profileId: string, body: string, imageUri?: string, imageFile?: File) {
      if (!hasSession()) return;
      const targetId = profileId === LOCAL_USER_ID ? getMyRealId() : profileId;
      if (!targetId) return;
      try {
        const uploaded = await ensureUploaded(imageUri, imageFile);
        const dto = await usersApi.postWall(targetId, body, uploaded);
        dispatch({ type: "ADD_WALL_MESSAGE", payload: mapWallMessage(dto, getMyRealId()) });
      } catch (error) {
        console.warn("[menzo/api] addWallMessage failed", error);
        showToast(error instanceof ApiError ? error.message : "No pudimos publicar en el muro. Inténtalo de nuevo.");
      }
    }

    async function loadWallComments(wallMessageId: string, page = 0) {
      try {
        const result = await usersApi.wallComments(wallMessageId, page);
        const myRealId = getMyRealId();
        dispatch({
          type: "MERGE_SOCIAL",
          payload: {
            wallComments: result.items.map((dto) => mapWallComment(dto, myRealId)),
            users: result.items.map((dto) => mapUserSummary(dto.author, myRealId)),
          },
        });
        return { hasNext: result.hasNext };
      } catch (error) {
        console.warn("[menzo/api] loadWallComments failed", error);
        return null;
      }
    }

    async function addWallComment(
      wallMessageId: string,
      body: string,
      options?: { imageUri?: string; imageFile?: File; parentCommentId?: string }
    ) {
      if (!hasSession()) return;
      try {
        const uploaded = await ensureUploaded(options?.imageUri, options?.imageFile);
        const dto = await usersApi.addWallComment(wallMessageId, body, uploaded, options?.parentCommentId);
        dispatch({ type: "ADD_WALL_COMMENT", payload: mapWallComment(dto, getMyRealId()) });
      } catch (error) {
        console.warn("[menzo/api] addWallComment failed", error);
        showToast(error instanceof ApiError ? error.message : "No pudimos publicar el comentario. Inténtalo de nuevo.");
      }
    }

    async function deleteWallComment(commentId: string, wallMessageId: string) {
      if (!hasSession()) return;
      try {
        await usersApi.deleteWallComment(commentId);
        dispatch({ type: "REMOVE_WALL_COMMENT", payload: { id: commentId, wallMessageId } });
      } catch (error) {
        console.warn("[menzo/api] deleteWallComment failed", error);
        showToast("No pudimos borrar el comentario. Inténtalo de nuevo.");
      }
    }

    /** Un comentario empujado por WebSocket (propio o ajeno) — ADD_WALL_COMMENT ya dedupea por id,
     * así que si este mismo comentario ya se agregó de forma optimista via addWallComment() no se
     * duplica ni se cuenta dos veces. */
    function receiveWallComment(dto: import("@/lib/api").WallCommentDto) {
      const myRealId = getMyRealId();
      dispatch({ type: "MERGE_SOCIAL", payload: { users: [mapUserSummary(dto.author, myRealId)] } });
      dispatch({ type: "ADD_WALL_COMMENT", payload: mapWallComment(dto, myRealId) });
    }

    function removeWallComment(commentId: string, wallMessageId: string) {
      dispatch({ type: "REMOVE_WALL_COMMENT", payload: { id: commentId, wallMessageId } });
    }

    async function toggleWallCommentLike(commentId: string, wallMessageId: string) {
      if (!hasSession()) return;
      const wasLiked = stateRef.current.social.wallComments.find((c) => c.id === commentId)?.likedByMe ?? false;
      try {
        if (wasLiked) {
          await usersApi.unlikeWallComment(commentId);
        } else {
          await usersApi.likeWallComment(commentId);
        }
        const result = await usersApi.wallComments(wallMessageId);
        const myRealId = getMyRealId();
        dispatch({ type: "MERGE_SOCIAL", payload: { wallComments: result.items.map((dto) => mapWallComment(dto, myRealId)) } });
      } catch (error) {
        console.warn("[menzo/api] toggleWallCommentLike failed", error);
      }
    }

    function toggleFollow(userId: string) {
      const wasFollowing = stateRef.current.social.following.includes(userId);
      dispatch({ type: "TOGGLE_FOLLOW", payload: { userId } });
      if (!hasSession()) return;
      const call = wasFollowing ? usersApi.unfollow(userId) : usersApi.follow(userId);
      call.catch((error) => {
        console.warn("[menzo/api] toggleFollow failed", error);
        // La petición falló: revertimos el cambio optimista para que la UI no quede mostrando
        // un estado que el servidor nunca guardó (antes esto se corregía en silencio recién en
        // el siguiente refreshSocial, dando la sensación de que "el follow se quita solo").
        dispatch({ type: "TOGGLE_FOLLOW", payload: { userId } });
        showToast(
          wasFollowing ? "No pudimos dejar de seguir. Inténtalo de nuevo." : "No pudimos seguir a esta persona. Inténtalo de nuevo."
        );
      });
    }

    async function openDirectMessage(userId: string): Promise<string | null> {
      if (!hasSession()) return null;
      try {
        const dto = await chatApi.openDirect(userId);
        const room = mapChatRoom(dto, getMyRealId());
        dispatch({ type: "MERGE_SOCIAL", payload: { rooms: [room] } });
        return room.id;
      } catch (error) {
        console.warn("[menzo/api] openDirectMessage failed", error);
        return null;
      }
    }

    async function loadNotifications() {
      try {
        const page = await notificationsApi.list(0, 30);
        const myRealId = getMyRealId();
        dispatch({ type: "MERGE_SOCIAL", payload: { notifications: page.items.map((dto) => mapNotification(dto, myRealId)) } });
      } catch (error) {
        console.warn("[menzo/api] loadNotifications failed", error);
      }
    }

    function markNotificationRead(id: string) {
      dispatch({ type: "MARK_NOTIFICATION_READ", payload: { id } });
      if (hasSession()) notificationsApi.markRead(id).catch((error) => console.warn("[menzo/api] markRead failed", error));
    }

    function markAllNotificationsRead() {
      dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" });
      if (hasSession()) notificationsApi.markAllRead().catch((error) => console.warn("[menzo/api] markAllRead failed", error));
    }

    function addRecentlyViewed(entry: RecentlyViewedEntry) {
      dispatch({ type: "ADD_RECENTLY_VIEWED", payload: entry });
      if (hasSession()) activityApi.addRecentlyViewed(entry.kind, entry.id).catch((error) => console.warn("[menzo/api] addRecentlyViewed failed", error));
    }

    function addRecentSearch(query: string) {
      dispatch({ type: "ADD_RECENT_SEARCH", payload: query });
      if (hasSession()) activityApi.addRecentSearch(query).catch((error) => console.warn("[menzo/api] addRecentSearch failed", error));
    }

    function clearRecentSearches() {
      dispatch({ type: "CLEAR_RECENT_SEARCHES" });
      if (hasSession()) activityApi.clearRecentSearches().catch((error) => console.warn("[menzo/api] clearRecentSearches failed", error));
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
      updatePost,
      deletePost,
      leaveOrDeleteRoom,
      sendMessage,
      deleteMessage,
      toggleReaction,
      loadRoomMessages,
      receiveRoomMessage,
      createRoom,
      toggleFavoriteRoom,
      joinRoom,
      loadDiscoverRooms,
      loadLiveRooms,
      updateRoomSettings,
      receiveRoomUpdate,
      refreshSocial,
      ensurePostLoaded,
      loadPostComments,
      addComment,
      votePoll,
      ensureUserLoaded,
      refreshUser,
      addUserTitle,
      removeUserTitle,
      loadProfileWall,
      addWallMessage,
      loadWallComments,
      addWallComment,
      deleteWallComment,
      receiveWallComment,
      removeWallComment,
      toggleWallCommentLike,
      toggleFollow,
      openDirectMessage,
      loadNotifications,
      markNotificationRead,
      markAllNotificationsRead,
      addRecentlyViewed,
      addRecentSearch,
      clearRecentSearches,
    };
  }, [showToast]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastSync = 0;
    const SYNC_THROTTLE_MS = 10_000;

    // Sin esto, la única forma de que la app "se entere" de que la conexión volvió (wifi
    // cortado, celular sin señal un rato, pestaña en segundo plano en un cell que suspende JS)
    // era que la persona refrescara la página a mano — de ahí el reporte de que hay que
    // refrescar para que cargue. Se replica el patrón "refetch on focus/reconnect" que ya usan
    // librerías tipo React Query, pero a mano porque esta app maneja su propio store.
    function resync() {
      if (!hasSession()) return;
      const now = Date.now();
      if (now - lastSync < SYNC_THROTTLE_MS) return;
      lastSync = now;
      (async () => {
        // Si hydrate() no pudo traer el perfil real (backend dormido/sin red al abrir la app),
        // acá se reintenta — sin esto quien perdió la primera carga se queda con la app
        // "trabada" hasta un refresh manual.
        if (!stateRef.current.profile) {
          await actions.refreshProfile().catch(() => {});
        }
        actions.refreshSocial().catch(() => {});
      })();
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") resync();
    }

    window.addEventListener("online", resync);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("online", resync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [actions]);

  const value = useMemo(() => ({ state, actions }), [state, actions]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used within an AppStateProvider");
  return ctx;
}

export { LOCAL_USER_ID };
