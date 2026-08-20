import { apiFetch } from "./client";
import type {
  AddQueueItemRequest,
  AddUserTitleRequest,
  AuraDto,
  AuthResponseDto,
  BadgeDto,
  BanDto,
  ChangeRoleRequest,
  ChatRoomDto,
  CommentDto,
  CommunityConfigDto,
  CreateMatchRequest,
  CreatePostRequest,
  CreateRoomRequest,
  CommunityDetailDto,
  CommunityMemberDto,
  CommunityMembershipDto,
  CommunitySummaryDto,
  CreateStickerPackRequest,
  GifSearchResponseDto,
  InterestDto,
  LiveParticipantDto,
  LiveSessionDto,
  LiveTokenDto,
  LoginRequest,
  MessageDto,
  MatchActionRequest,
  MatchResponseDto,
  MatchStatus,
  LevelDefinitionDto,
  ModerationActionDto,
  MyCommunityDto,
  ModerationActionRequest,
  ModerationActionType,
  ModerationQueueItemDto,
  ModerationQueueStatus,
  MusicSessionDto,
  MusicSettingsRequest,
  NotificationDto,
  OnboardingRequest,
  PageResponse,
  PostDto,
  QueueItemDto,
  ReasonRequest,
  RecentlyViewedDto,
  RefreshRequest,
  RegisterRequest,
  ReorderQueueRequest,
  RequestSongRequest,
  RoomMemberDto,
  SecurityAuditLogDto,
  SecurityEventType,
  SeekRequest,
  SendMessageRequest,
  SettingsDto,
  StartLiveRequest,
  StickerPackDetailDto,
  StickerPackSummaryDto,
  UpdateCommunityAppearanceRequest,
  UpdateCommunityNavigationRequest,
  UpdateCommunityThemeRequest,
  UpdateLiveRequest,
  UpdateProfileRequest,
  UpdatePostRequest,
  UpdateRoomRequest,
  UpdateSettingsRequest,
  UploadResponseDto,
  UserProfileDto,
  VersionedRequest,
  VoiceParticipantsDto,
  VoiceTokenDto,
  WallCommentDto,
  WallMessageDto,
  YoutubeSearchResultDto,
} from "./types";

function qs(params: Record<string, string | number | undefined>) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

export const authApi = {
  register: (body: RegisterRequest) =>
    apiFetch<AuthResponseDto>("/api/auth/register", { method: "POST", body, skipAuth: true }),
  login: (body: LoginRequest) =>
    apiFetch<AuthResponseDto>("/api/auth/login", { method: "POST", body, skipAuth: true }),
  refresh: (body: RefreshRequest) =>
    apiFetch<AuthResponseDto>("/api/auth/refresh", { method: "POST", body, skipAuth: true }),
  logout: (body: RefreshRequest) => apiFetch<void>("/api/auth/logout", { method: "POST", body, skipAuth: true }),
};

export const usersApi = {
  me: () => apiFetch<UserProfileDto>("/api/users/me"),
  onboarding: (body: OnboardingRequest) =>
    apiFetch<UserProfileDto>("/api/users/me/onboarding", { method: "POST", body }),
  updateMe: (body: UpdateProfileRequest) => apiFetch<UserProfileDto>("/api/users/me", { method: "PATCH", body }),
  heartbeat: () => apiFetch<void>("/api/users/me/heartbeat", { method: "POST" }),
  getSettings: () => apiFetch<SettingsDto>("/api/users/me/settings"),
  updateSettings: (body: UpdateSettingsRequest) =>
    apiFetch<SettingsDto>("/api/users/me/settings", { method: "PATCH", body }),
  search: (query: string, page = 0, size = 20) =>
    apiFetch<PageResponse<UserProfileDto>>(`/api/users/search${qs({ query, page, size })}`),
  getById: (id: string) => apiFetch<UserProfileDto>(`/api/users/${id}`),
  follow: (id: string) => apiFetch<void>(`/api/users/${id}/follow`, { method: "PUT" }),
  unfollow: (id: string) => apiFetch<void>(`/api/users/${id}/follow`, { method: "DELETE" }),
  followers: (id: string) => apiFetch<UserProfileDto[]>(`/api/users/${id}/followers`),
  following: (id: string) => apiFetch<UserProfileDto[]>(`/api/users/${id}/following`),
  wall: (id: string, page = 0, size = 20) =>
    apiFetch<PageResponse<WallMessageDto>>(`/api/users/${id}/wall${qs({ page, size })}`),
  postWall: (id: string, body: string, imageUri?: string) =>
    apiFetch<WallMessageDto>(`/api/users/${id}/wall`, { method: "POST", body: { body, imageUri } }),
  posts: (id: string, page = 0, size = 20) =>
    apiFetch<PageResponse<PostDto>>(`/api/users/${id}/posts${qs({ page, size })}`),
  wallComments: (messageId: string, page = 0, size = 30) =>
    apiFetch<PageResponse<WallCommentDto>>(`/api/wall/${messageId}/comments${qs({ page, size })}`),
  addWallComment: (messageId: string, body: string, imageUri?: string, parentCommentId?: string) =>
    apiFetch<WallCommentDto>(`/api/wall/${messageId}/comments`, { method: "POST", body: { body, imageUri, parentCommentId } }),
  deleteWallComment: (commentId: string) => apiFetch<void>(`/api/wall/comments/${commentId}`, { method: "DELETE" }),
  likeWallComment: (commentId: string) => apiFetch<void>(`/api/wall/comments/${commentId}/like`, { method: "PUT" }),
  unlikeWallComment: (commentId: string) =>
    apiFetch<void>(`/api/wall/comments/${commentId}/like`, { method: "DELETE" }),
};

export const lookupsApi = {
  auras: () => apiFetch<AuraDto[]>("/api/lookups/auras"),
  interests: () => apiFetch<InterestDto[]>("/api/lookups/interests"),
  badges: () => apiFetch<BadgeDto[]>("/api/lookups/badges"),
};

export const postsApi = {
  // communityId opcional (ver PostController en menzoapi): sin él no filtra nada. Los clientes
  // actualizados siempre mandan la comunidad activa para no mezclar publicaciones entre comunidades.
  list: (communityId?: string, page = 0, size = 20) =>
    apiFetch<PageResponse<PostDto>>(`/api/posts${qs({ communityId, page, size })}`),
  featured: (communityId?: string, page = 0, size = 20) =>
    apiFetch<PageResponse<PostDto>>(`/api/posts/featured${qs({ communityId, page, size })}`),
  blogs: (communityId?: string, page = 0, size = 20) =>
    apiFetch<PageResponse<PostDto>>(`/api/posts/blogs${qs({ communityId, page, size })}`),
  bookmarked: (page = 0, size = 20) => apiFetch<PageResponse<PostDto>>(`/api/posts/bookmarked${qs({ page, size })}`),
  search: (query: string, communityId?: string, page = 0, size = 20) =>
    apiFetch<PageResponse<PostDto>>(`/api/posts/search${qs({ query, communityId, page, size })}`),
  getById: (id: string) => apiFetch<PostDto>(`/api/posts/${id}`),
  create: (body: CreatePostRequest) => apiFetch<PostDto>("/api/posts", { method: "POST", body }),
  update: (id: string, body: UpdatePostRequest) => apiFetch<PostDto>(`/api/posts/${id}`, { method: "PUT", body }),
  // body solo hace falta cuando quien borra no es el autor (staff LEADER+, motivo obligatorio) —
  // ver PostController.deletePost/PostService.deletePost en menzoapi.
  remove: (id: string, body?: ReasonRequest) => apiFetch<void>(`/api/posts/${id}`, { method: "DELETE", body }),
  like: (id: string) => apiFetch<void>(`/api/posts/${id}/like`, { method: "PUT" }),
  unlike: (id: string) => apiFetch<void>(`/api/posts/${id}/like`, { method: "DELETE" }),
  bookmark: (id: string) => apiFetch<void>(`/api/posts/${id}/bookmark`, { method: "PUT" }),
  unbookmark: (id: string) => apiFetch<void>(`/api/posts/${id}/bookmark`, { method: "DELETE" }),
  vote: (id: string, optionId: string) =>
    apiFetch<PostDto>(`/api/posts/${id}/vote`, { method: "POST", body: { optionId } }),
  comments: (id: string, page = 0, size = 30) =>
    apiFetch<PageResponse<CommentDto>>(`/api/posts/${id}/comments${qs({ page, size })}`),
  addComment: (id: string, body: string) =>
    apiFetch<CommentDto>(`/api/posts/${id}/comments`, { method: "POST", body: { body } }),
};

export const gifsApi = {
  search: (q: string, pos?: string) => apiFetch<GifSearchResponseDto>(`/api/gifs/search${qs({ q, pos })}`),
  trending: (pos?: string) => apiFetch<GifSearchResponseDto>(`/api/gifs/trending${qs({ pos })}`),
};

export const chatApi = {
  // communityId opcional (ver ChatController en menzoapi): filtra solo salas PUBLIC — las DIRECT
  // (mensajes privados) el backend las devuelve siempre, sin importar communityId.
  rooms: (communityId?: string) => apiFetch<ChatRoomDto[]>(`/api/chat/rooms${qs({ communityId })}`),
  discover: (sort: "recent" | "popular" = "recent", communityId?: string) =>
    apiFetch<ChatRoomDto[]>(`/api/chat/rooms/discover${qs({ sort, communityId })}`),
  liveRooms: (communityId?: string) => apiFetch<ChatRoomDto[]>(`/api/chat/rooms/live${qs({ communityId })}`),
  getRoom: (id: string) => apiFetch<ChatRoomDto>(`/api/chat/rooms/${id}`),
  openDirect: (userId: string) => apiFetch<ChatRoomDto>(`/api/chat/rooms/dm/${userId}`, { method: "POST" }),
  createRoom: (body: CreateRoomRequest) => apiFetch<ChatRoomDto>("/api/chat/rooms", { method: "POST", body }),
  updateRoom: (id: string, body: UpdateRoomRequest) =>
    apiFetch<ChatRoomDto>(`/api/chat/rooms/${id}`, { method: "PATCH", body }),
  join: (id: string) => apiFetch<void>(`/api/chat/rooms/${id}/join`, { method: "POST" }),
  leave: (id: string) => apiFetch<void>(`/api/chat/rooms/${id}/leave`, { method: "POST" }),
  favorite: (id: string) => apiFetch<void>(`/api/chat/rooms/${id}/favorite`, { method: "PUT" }),
  unfavorite: (id: string) => apiFetch<void>(`/api/chat/rooms/${id}/favorite`, { method: "DELETE" }),
  messages: (id: string, page = 0, size = 40) =>
    apiFetch<PageResponse<MessageDto>>(`/api/chat/rooms/${id}/messages${qs({ page, size })}`),
  sendMessage: (id: string, body: SendMessageRequest) =>
    apiFetch<MessageDto>(`/api/chat/rooms/${id}/messages`, { method: "POST", body }),
  deleteMessage: (id: string, messageId: string, body?: ReasonRequest) =>
    apiFetch<void>(`/api/chat/rooms/${id}/messages/${messageId}`, { method: "DELETE", body }),
  toggleReaction: (id: string, messageId: string, emoji: string) =>
    apiFetch<MessageDto>(`/api/chat/rooms/${id}/messages/${messageId}/reactions`, { method: "POST", body: { emoji } }),
  members: (id: string) => apiFetch<RoomMemberDto[]>(`/api/chat/rooms/${id}/members`),
  promote: (id: string, userId: string) =>
    apiFetch<void>(`/api/chat/rooms/${id}/members/${userId}/promote`, { method: "POST" }),
  demote: (id: string, userId: string) =>
    apiFetch<void>(`/api/chat/rooms/${id}/members/${userId}/demote`, { method: "POST" }),
  kick: (id: string, userId: string) =>
    apiFetch<void>(`/api/chat/rooms/${id}/members/${userId}`, { method: "DELETE" }),
  ban: (id: string, userId: string, body?: ModerationActionRequest) =>
    apiFetch<void>(`/api/chat/rooms/${id}/members/${userId}/ban`, { method: "POST", body }),
  unban: (id: string, userId: string) =>
    apiFetch<void>(`/api/chat/rooms/${id}/bans/${userId}`, { method: "DELETE" }),
  bans: (id: string) => apiFetch<BanDto[]>(`/api/chat/rooms/${id}/bans`),
  invite: (id: string, userId: string) =>
    apiFetch<void>(`/api/chat/rooms/${id}/members/${userId}/invite`, { method: "POST" }),
  transferOwnership: (id: string, userId: string) =>
    apiFetch<void>(`/api/chat/rooms/${id}/transfer-ownership/${userId}`, { method: "POST" }),
  deleteRoom: (id: string) => apiFetch<void>(`/api/chat/rooms/${id}`, { method: "DELETE" }),
};

/** Endpoints viejos, sin roles — se mantienen intactos porque menzomovil todavía los usa tal
 * cual. La web ya no los llama: usa liveApi (LIVE moderado) en su lugar. Ver LiveService en
 * menzoapi para el porqué de la separación. */
export const voiceApi = {
  getToken: (roomId: string) => apiFetch<VoiceTokenDto>(`/api/chat/rooms/${roomId}/voice/token`, { method: "POST" }),
  join: (roomId: string) => apiFetch<VoiceParticipantsDto>(`/api/chat/rooms/${roomId}/voice/join`, { method: "POST" }),
  leave: (roomId: string) => apiFetch<VoiceParticipantsDto>(`/api/chat/rooms/${roomId}/voice/leave`, { method: "POST" }),
  participants: (roomId: string) => apiFetch<VoiceParticipantsDto>(`/api/chat/rooms/${roomId}/voice/participants`),
};

export const liveApi = {
  // El backend responde 204 sin cuerpo cuando no hay un LIVE activo — apiFetch ya lo traduce a
  // `undefined` para cualquier T, así que este tipo de retorno refleja eso en vez de inventar un
  // "null" que la respuesta real nunca envía.
  state: (roomId: string) => apiFetch<LiveSessionDto | undefined>(`/api/chat/rooms/${roomId}/live`),
  start: (roomId: string, body?: StartLiveRequest) =>
    apiFetch<LiveSessionDto>(`/api/chat/rooms/${roomId}/live/start`, { method: "POST", body }),
  end: (roomId: string) => apiFetch<void>(`/api/chat/rooms/${roomId}/live/end`, { method: "POST" }),
  update: (roomId: string, body: UpdateLiveRequest) =>
    apiFetch<LiveSessionDto>(`/api/chat/rooms/${roomId}/live`, { method: "PATCH", body }),
  join: (roomId: string) => apiFetch<LiveSessionDto>(`/api/chat/rooms/${roomId}/live/join`, { method: "POST" }),
  leave: (roomId: string) => apiFetch<void>(`/api/chat/rooms/${roomId}/live/leave`, { method: "POST" }),
  // menzomovil ya llama esto cada 15s mientras hay un LIVE activo (ver LiveNotifier._startHeartbeat);
  // la web nunca lo hizo, así que un cierre abrupto de pestaña (crash, cerrar sin beforeunload)
  // dejaba al usuario como participante fantasma para siempre en la sala — nada expiraba su fila
  // individual (el heartbeat de sesión que sí existe solo cubre que la sesión ENTERA no se cierre
  // sola, no que cada participante se limpie). Ver LiveService.heartbeat en el backend.
  heartbeat: (roomId: string) => apiFetch<void>(`/api/chat/rooms/${roomId}/live/heartbeat`, { method: "POST" }),
  token: (roomId: string) => apiFetch<LiveTokenDto>(`/api/chat/rooms/${roomId}/live/token`),
  participants: (roomId: string) => apiFetch<LiveParticipantDto[]>(`/api/chat/rooms/${roomId}/live/participants`),
  setMicrophone: (roomId: string, enabled: boolean) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/microphone`, { method: "POST", body: { enabled } }),
  setScreenSharing: (roomId: string, enabled: boolean) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/screen-share`, { method: "POST", body: { enabled } }),
  requestToSpeak: (roomId: string) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/speaking-requests`, { method: "POST" }),
  cancelSpeakRequest: (roomId: string) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/speaking-requests/cancel`, { method: "POST" }),
  speakingRequests: (roomId: string) =>
    apiFetch<LiveParticipantDto[]>(`/api/chat/rooms/${roomId}/live/speaking-requests`),
  approveSpeaking: (roomId: string, userId: string) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/speaking-requests/${userId}/approve`, { method: "POST" }),
  rejectSpeaking: (roomId: string, userId: string) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/speaking-requests/${userId}/reject`, { method: "POST" }),
  demoteParticipant: (roomId: string, userId: string) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/participants/${userId}/demote`, { method: "POST" }),
  muteParticipant: (roomId: string, userId: string) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/participants/${userId}/mute`, { method: "POST" }),
  removeParticipant: (roomId: string, userId: string, body?: ReasonRequest) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/participants/${userId}`, { method: "DELETE", body }),
};

export const musicApi = {
  snapshot: (roomId: string) => apiFetch<MusicSessionDto>(`/api/chat/rooms/${roomId}/live/music`),
  search: (roomId: string, q: string) =>
    apiFetch<YoutubeSearchResultDto[]>(`/api/chat/rooms/${roomId}/live/music/search${qs({ q })}`),
  queue: (roomId: string) => apiFetch<QueueItemDto[]>(`/api/chat/rooms/${roomId}/live/music/queue`),
  addToQueue: (roomId: string, body: AddQueueItemRequest) =>
    apiFetch<MusicSessionDto>(`/api/chat/rooms/${roomId}/live/music/queue`, { method: "POST", body }),
  requestSong: (roomId: string, body: RequestSongRequest) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/music/requests`, { method: "POST", body }),
  approveRequest: (roomId: string, requestId: string) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/music/requests/${requestId}/approve`, { method: "POST" }),
  rejectRequest: (roomId: string, requestId: string) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/music/requests/${requestId}/reject`, { method: "POST" }),
  play: (roomId: string, body?: VersionedRequest) =>
    apiFetch<MusicSessionDto>(`/api/chat/rooms/${roomId}/live/music/play`, { method: "POST", body }),
  pause: (roomId: string, body?: VersionedRequest) =>
    apiFetch<MusicSessionDto>(`/api/chat/rooms/${roomId}/live/music/pause`, { method: "POST", body }),
  resume: (roomId: string, body?: VersionedRequest) =>
    apiFetch<MusicSessionDto>(`/api/chat/rooms/${roomId}/live/music/resume`, { method: "POST", body }),
  seek: (roomId: string, body: SeekRequest) =>
    apiFetch<MusicSessionDto>(`/api/chat/rooms/${roomId}/live/music/seek`, { method: "POST", body }),
  skip: (roomId: string, body?: VersionedRequest) =>
    apiFetch<MusicSessionDto>(`/api/chat/rooms/${roomId}/live/music/skip`, { method: "POST", body }),
  stop: (roomId: string, body?: VersionedRequest) =>
    apiFetch<MusicSessionDto>(`/api/chat/rooms/${roomId}/live/music/stop`, { method: "POST", body }),
  updateSettings: (roomId: string, body: MusicSettingsRequest) =>
    apiFetch<MusicSessionDto>(`/api/chat/rooms/${roomId}/live/music/settings`, { method: "PATCH", body }),
  reorderQueue: (roomId: string, body: ReorderQueueRequest) =>
    apiFetch<MusicSessionDto>(`/api/chat/rooms/${roomId}/live/music/queue/reorder`, { method: "PATCH", body }),
  removeQueueItem: (roomId: string, queueItemId: string) =>
    apiFetch<void>(`/api/chat/rooms/${roomId}/live/music/queue/${queueItemId}`, { method: "DELETE" }),
  clearQueue: (roomId: string) => apiFetch<void>(`/api/chat/rooms/${roomId}/live/music/queue`, { method: "DELETE" }),
};

export const communityApi = {
  config: () => apiFetch<CommunityConfigDto>("/api/community/config"),
};

export const notificationsApi = {
  list: (page = 0, size = 30) =>
    apiFetch<PageResponse<NotificationDto>>(`/api/notifications${qs({ page, size })}`),
  markRead: (id: string) => apiFetch<void>(`/api/notifications/${id}/read`, { method: "POST" }),
  markAllRead: () => apiFetch<void>("/api/notifications/read-all", { method: "POST" }),
};

export const activityApi = {
  recentlyViewed: () => apiFetch<RecentlyViewedDto[]>("/api/activity/recently-viewed"),
  addRecentlyViewed: (kind: "post" | "member", id: string) =>
    apiFetch<void>("/api/activity/recently-viewed", { method: "POST", body: { kind, id } }),
  recentSearches: () => apiFetch<string[]>("/api/activity/recent-searches"),
  addRecentSearch: (query: string) =>
    apiFetch<void>("/api/activity/recent-searches", { method: "POST", body: { query } }),
  clearRecentSearches: () => apiFetch<void>("/api/activity/recent-searches", { method: "DELETE" }),
};

export const uploadsApi = {
  upload: async (file: File): Promise<string> => {
    const form = new FormData();
    form.append("file", file, file.name);
    const response = await apiFetch<UploadResponseDto>("/api/uploads", { method: "POST", formData: form });
    return response.url;
  },
};

/** Sube el archivo solo si `uri` es un archivo local (blob:/data:); si ya es una URL http(s) la deja igual. */
export async function ensureUploaded(uri: string | undefined, file: File | undefined): Promise<string | undefined> {
  if (!uri) return undefined;
  if (/^https?:\/\//.test(uri)) return uri;
  if (!file) return undefined;
  return uploadsApi.upload(file);
}

/** Panel de staff global (CURATOR/LEADER/MASTER) — ver AdminController en menzoapi. Nunca hay un
 * endpoint acá para navegar mensajes/salas: eso queda estructuralmente excluido (ver plan). */
export const adminApi = {
  searchUsers: (query: string, page = 0, size = 20) =>
    apiFetch<PageResponse<UserProfileDto>>(`/api/admin/users${qs({ query, page, size })}`),
  suspendUser: (id: string, body: ReasonRequest) =>
    apiFetch<void>(`/api/admin/users/${id}/suspend`, { method: "POST", body }),
  unsuspendUser: (id: string, body: ReasonRequest) =>
    apiFetch<void>(`/api/admin/users/${id}/unsuspend`, { method: "POST", body }),
  deleteAccount: (id: string, body: ReasonRequest) =>
    apiFetch<void>(`/api/admin/users/${id}`, { method: "DELETE", body }),
  changeRole: (id: string, body: ChangeRoleRequest) =>
    apiFetch<void>(`/api/admin/users/${id}/role`, { method: "POST", body }),
  addTitle: (id: string, body: AddUserTitleRequest) =>
    apiFetch<UserProfileDto>(`/api/admin/users/${id}/titles`, { method: "POST", body }),
  removeTitle: (id: string, titleId: string) =>
    apiFetch<UserProfileDto>(`/api/admin/users/${id}/titles/${titleId}`, { method: "DELETE" }),
  searchPosts: (query: string, page = 0, size = 20) =>
    apiFetch<PageResponse<PostDto>>(`/api/admin/posts${qs({ query, page, size })}`),
  hidePost: (id: string, body: ReasonRequest) =>
    apiFetch<void>(`/api/admin/posts/${id}/hide`, { method: "POST", body }),
  unhidePost: (id: string, body: ReasonRequest) =>
    apiFetch<void>(`/api/admin/posts/${id}/unhide`, { method: "POST", body }),
  moderationLog: (page = 0, size = 30, actorId?: string, actionType?: ModerationActionType) =>
    apiFetch<PageResponse<ModerationActionDto>>(
      `/api/admin/moderation-log${qs({ page, size, actorId, actionType })}`
    ),
  // Cola de contenido marcado automáticamente por la pipeline de seguridad (LEADER+) y su audit
  // log (MASTER-only) — ver ModerationQueueService/SecurityAuditService en menzoapi. Vacío hasta
  // que esa pipeline se conecte a endpoints reales (FASE F del plan de seguridad).
  moderationQueue: (page = 0, size = 30, status?: ModerationQueueStatus, contentType?: string) =>
    apiFetch<PageResponse<ModerationQueueItemDto>>(
      `/api/admin/security/moderation-queue${qs({ page, size, status, contentType })}`
    ),
  moderationQueuePendingCount: () => apiFetch<number>("/api/admin/security/moderation-queue/pending-count"),
  dismissModerationQueueItem: (id: string, body: ReasonRequest) =>
    apiFetch<ModerationQueueItemDto>(`/api/admin/security/moderation-queue/${id}/dismiss`, {
      method: "POST",
      body,
    }),
  actionModerationQueueItem: (id: string, body: ReasonRequest) =>
    apiFetch<ModerationQueueItemDto>(`/api/admin/security/moderation-queue/${id}/action`, {
      method: "POST",
      body,
    }),
  securityAuditLog: (page = 0, size = 30, eventType?: SecurityEventType, subjectId?: string) =>
    apiFetch<PageResponse<SecurityAuditLogDto>>(
      `/api/admin/security/audit-log${qs({ page, size, eventType, subjectId })}`
    ),
  // LEADER+ (ver AdminAuthorizationService.requireLeader en menzoapi) — nombres de los 20
  // niveles del sistema de XP por tiempo activo (ver LevelCurve/LevelNameService).
  listLevels: () => apiFetch<LevelDefinitionDto[]>("/api/admin/levels"),
  renameLevel: (level: number, name: string) =>
    apiFetch<LevelDefinitionDto>(`/api/admin/levels/${level}`, { method: "PUT", body: { name } }),
};

/** Dominio nuevo (multi-comunidad: Naruto, Anime, etc.) — `/api/communities` (plural), separado
 * de `communityApi` de arriba (`/api/community/*` singular, la config/eventos de Menzo como
 * plataforma única, sin relación con esto). Ver CommunitiesController en menzoapi. */
export const communitiesApi = {
  list: (page = 0, size = 20) => apiFetch<PageResponse<CommunitySummaryDto>>(`/api/communities${qs({ page, size })}`),
  discover: (query?: string, page = 0, size = 20) =>
    apiFetch<PageResponse<CommunitySummaryDto>>(`/api/communities/discover${qs({ query, page, size })}`),
  my: () => apiFetch<MyCommunityDto[]>("/api/communities/my"),
  getBySlug: (slug: string) => apiFetch<CommunityDetailDto>(`/api/communities/${slug}`),
  join: (id: string) => apiFetch<CommunityMembershipDto>(`/api/communities/${id}/join`, { method: "POST" }),
  leave: (id: string) => apiFetch<void>(`/api/communities/${id}/leave`, { method: "POST" }),
  // COMMUNITY_ADMIN+ de esa comunidad, o cuenta global LEADER+ — ver CommunitiesController.
  updateAppearance: (id: string, body: UpdateCommunityAppearanceRequest) =>
    apiFetch<CommunityDetailDto>(`/api/communities/${id}/appearance`, { method: "PATCH", body }),
  updateTheme: (id: string, body: UpdateCommunityThemeRequest) =>
    apiFetch<CommunityDetailDto>(`/api/communities/${id}/theme`, { method: "PATCH", body }),
  updateNavigation: (id: string, body: UpdateCommunityNavigationRequest) =>
    apiFetch<CommunityDetailDto>(`/api/communities/${id}/navigation`, { method: "PATCH", body }),
  // Mismo criterio de visibilidad que getBySlug (pública/no-listada abierta a cualquiera con
  // sesión, privada requiere membresía activa) — ver CommunityPermissionEvaluator en menzoapi.
  members: (id: string, page = 0, size = 30) =>
    apiFetch<PageResponse<CommunityMemberDto>>(`/api/communities/${id}/members${qs({ page, size })}`),
};

export const stickersApi = {
  createPack: (body: CreateStickerPackRequest) =>
    apiFetch<StickerPackDetailDto>("/api/stickers/packs", { method: "POST", body }),
  listPacks: (query?: string, page = 0, size = 24) =>
    apiFetch<PageResponse<StickerPackSummaryDto>>(`/api/stickers/packs${qs({ query, page, size })}`),
  getPack: (id: string) => apiFetch<StickerPackDetailDto>(`/api/stickers/packs/${id}`),
  deletePack: (id: string, body?: ReasonRequest) =>
    apiFetch<void>(`/api/stickers/packs/${id}`, { method: "DELETE", body }),
};

/** Menzo Games — ver GameMatchController en menzoapi. El estado en vivo de una partida se sigue
 * por STOMP (ver lib/realtime/useGameMatchSocket.ts), estos endpoints son para crear/consultar/
 * jugar/abandonar. */
export const gamesApi = {
  createMatch: (body: CreateMatchRequest) =>
    apiFetch<MatchResponseDto>("/api/games/matches", { method: "POST", body }),
  getMatch: (id: string) => apiFetch<MatchResponseDto>(`/api/games/matches/${id}`),
  listMyMatches: (status?: MatchStatus, page = 0, size = 20) =>
    apiFetch<PageResponse<MatchResponseDto>>(`/api/games/matches${qs({ status, page, size })}`),
  act: (id: string, body: MatchActionRequest) =>
    apiFetch<MatchResponseDto>(`/api/games/matches/${id}/actions`, { method: "POST", body }),
  forfeit: (id: string) => apiFetch<void>(`/api/games/matches/${id}/forfeit`, { method: "POST" }),
};
