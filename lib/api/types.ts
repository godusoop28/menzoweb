// Contrato 1:1 con menzoapi. Nombres de campo exactos, case-sensitive.

export type PostType = "text" | "image" | "poll" | "question" | "event";
export type MessageType = "text" | "system" | "sticker";
export type GlobalRole = "USER" | "CURATOR" | "LEADER" | "MASTER";
export type NotificationCategory = "comentarios" | "likes" | "mensajes" | "eventos" | "seguimientos" | "en_vivo" | "juegos";
export type ActivityKind = "post" | "member";

export type PageResponse<T> = {
  items: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
};

export type ErrorResponse = {
  timestamp: string;
  status: number;
  /** Código estable para distinguir la causa sin parsear el mensaje humano — p. ej.
   * "YOUTUBE_QUOTA_EXCEEDED", "LIVE_NOT_ACTIVE". null en errores genéricos que no lo necesitan. */
  code: string | null;
  error: string;
  message: string;
  path: string;
  fieldErrors: Record<string, string> | null;
  /** Solo viene en 429 (ver MENZI_DJ_RATE_LIMITED) — segundos que hay que esperar antes de
   * reintentar. null en cualquier otro error. */
  retryAfterSeconds: number | null;
};

export type UserSummaryDto = {
  id: string;
  displayName: string;
  username: string;
  avatarUri: string | null;
  avatarGradient: string | null;
  isOnline: boolean;
};

/** Etiqueta de texto libre con color propio (p.ej. "Friendly") que un LEADER+ le otorgó a este
 * usuario — ver AdminService.addTitle en menzoapi. Se muestra debajo del perfil. */
export type UserTitleDto = { id: string; text: string; color: string; createdAt: string };

export type UserProfileDto = {
  id: string;
  displayName: string;
  username: string;
  avatarUri: string | null;
  avatarGradient: string | null;
  coverUri: string | null;
  backgroundUri: string | null;
  backgroundColor: string | null;
  aura: string;
  bio: string | null;
  statusText: string | null;
  interests: string[];
  joinedAt: string;
  level: number;
  xp: number;
  reputation: number;
  followers: number;
  following: number;
  visitors: number;
  isOnline: boolean;
  badges: string[];
  titles: UserTitleDto[];
  followedByMe: boolean;
  followsMe: boolean;
  areFriends: boolean;
  relationshipStatus: RelationshipStatus;
  globalRole: GlobalRole;
};

export type RelationshipStatus = "SELF" | "NONE" | "FOLLOWING" | "FOLLOWS_YOU" | "FRIENDS";

export type AuthResponseDto = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  email: string;
  onboardingCompleted: boolean;
  profile: UserProfileDto;
};

export type RegisterRequest = { email: string; password: string };
export type LoginRequest = { email: string; password: string };
export type RefreshRequest = { refreshToken: string };

export type OnboardingRequest = {
  displayName: string;
  aura: string;
  avatarUri: string | null;
  avatarGradient: string;
  interests: string[];
  communityIds: string[];
};

export type UpdateProfileRequest = {
  displayName?: string;
  avatarUri?: string;
  avatarGradient?: string;
  coverUri?: string;
  /** Cadena vacía "" limpia el campo; omitirlo lo deja sin cambios. */
  backgroundUri?: string;
  backgroundColor?: string;
  aura?: string;
  bio?: string;
  statusText?: string;
  interests?: string[];
};

export type PollOptionDto = { id: string; label: string; voteCount: number; votedByMe: boolean };
export type AbstractVisualDto = { preset: string; caption: string | null };

/** Espejo de PostBlock.java (backend) — `type` decide qué otros campos importan:
 * paragraph/heading usan `text` (+ formato, ver abajo); image/gif usan `url` (siempre https,
 * nunca un blob local), opcionalmente `alt` y `align`; divider no usa ninguno. `id` es generado
 * por el cliente, solo para keys de React al reordenar — el backend nunca le da significado
 * propio.
 *
 * Formato "tipo Word" por bloque (no por selección/carácter — ver comentario de BlockEditor.tsx
 * sobre por qué). `null` siempre significa "el default del cliente" (fontSize md, fontFamily
 * sans, align left, bold/italic false) — nunca se manda un default explícito. */
export type PostBlockType = "paragraph" | "heading" | "image" | "gif" | "divider";
export type PostBlockFontSize = "sm" | "md" | "lg" | "xl";
export type PostBlockFontFamily = "sans" | "serif" | "mono";
export type PostBlockAlign = "left" | "center" | "right";
export type PostBlockDto = {
  id: string;
  type: PostBlockType;
  text: string | null;
  url: string | null;
  alt: string | null;
  fontSize: PostBlockFontSize | null;
  fontFamily: PostBlockFontFamily | null;
  align: PostBlockAlign | null;
  bold: boolean | null;
  italic: boolean | null;
};

export type PostDto = {
  id: string;
  author: UserSummaryDto;
  type: PostType;
  title: string | null;
  body: string;
  imageUri: string | null;
  abstractVisual: AbstractVisualDto | null;
  gradient: string | null;
  tags: string[];
  pollOptions: PollOptionDto[];
  eventId: string | null;
  likeCount: number;
  likedByMe: boolean;
  bookmarkedByMe: boolean;
  commentCount: number;
  featured: boolean;
  createdAt: string;
  blocks: PostBlockDto[];
  hidden: boolean;
  communityId: string | null;
};

export type CreatePostRequest = {
  type: PostType;
  title?: string;
  body: string;
  imageUri?: string;
  abstractVisual?: { preset: string; caption?: string };
  gradient?: string;
  tags?: string[];
  pollOptions?: string[];
  eventId?: string;
  blocks?: PostBlockDto[];
  communityId?: string;
};

export type UpdatePostRequest = {
  title?: string;
  blocks: PostBlockDto[];
  tags?: string[];
  // Ignorado cuando edita el propio autor; obligatorio cuando edita un CURATOR+ el post de otra
  // persona (ver PostService.updatePost en menzoapi) — mismo criterio que el motivo de deletePost.
  reason?: string;
};

export type CommentDto = {
  id: string;
  postId: string;
  author: UserSummaryDto;
  body: string;
  createdAt: string;
};

export type CreateRoomRequest = {
  name: string;
  description?: string;
  topic?: string;
  gradient?: string;
  icon?: string;
  category?: string;
  communityId?: string;
};

export type RoomRole = "OWNER" | "CO_HOST" | "MEMBER";

export type ChatRoomLiveSummaryDto = {
  liveSessionId: string;
  title: string | null;
  announcement: string | null;
  participantCount: number;
  speakerCount: number;
  host: UserSummaryDto | null;
};

export type ChatRoomDto = {
  id: string;
  slug: string | null;
  name: string | null;
  description: string | null;
  topic: string | null;
  gradient: string | null;
  icon: string | null;
  type: "PUBLIC" | "DIRECT";
  avatarUri: string | null;
  coverUri: string | null;
  backgroundUri: string | null;
  category: string | null;
  maxMembers: number | null;
  requiresApproval: boolean;
  allowMembersToInvite: boolean;
  listed: boolean;
  peer: UserSummaryDto | null;
  memberCount: number;
  onlineCount: number;
  favorite: boolean;
  joined: boolean;
  role: RoomRole | null;
  live: boolean;
  liveSummary: ChatRoomLiveSummaryDto | null;
  createdAt: string;
  updatedAt: string | null;
  lastMessage: ChatRoomLastMessageDto | null;
  communityId: string | null;
};

export type RoomMemberDto = { user: UserSummaryDto; role: RoomRole; joinedAt: string };

export type BanDto = { user: UserSummaryDto; reason: string | null; createdAt: string; bannedBy: UserSummaryDto | null };

export type ModerationActionRequest = { reason?: string };

export type RoomModerationEvent = {
  type: "ROLE_CHANGED" | "KICKED" | "BANNED" | "INVITED";
  roomId: string;
  targetUserId: string;
  targetDisplayName: string;
  actorUserId: string;
  actorDisplayName: string;
  newRole: RoomRole | null;
};

export type UpdateRoomRequest = {
  /** Cadena vacía "" limpia el campo (donde aplica); omitir un campo lo deja sin cambios. */
  name?: string;
  description?: string;
  topic?: string;
  category?: string;
  avatarUri?: string;
  coverUri?: string;
  backgroundUri?: string;
  requiresApproval?: boolean;
  allowMembersToInvite?: boolean;
  listed?: boolean;
  maxMembers?: number | null;
};

// ---- LIVE moderado (roles, solicitudes para hablar, tokens por rol) -------------------------
// Aditivo sobre /voice/* (que sigue existiendo tal cual para la app móvil) — ver LiveService en
// menzoapi para el porqué de la separación.

export type LiveParticipantRole = "HOST" | "CO_HOST" | "SPEAKER" | "AUDIENCE" | "REQUESTED";

export type LiveSessionDto = {
  id: string;
  roomId: string;
  type: string;
  status: "ACTIVE" | "ENDED";
  title: string | null;
  description: string | null;
  announcement: string | null;
  startedByUserId: string | null;
  startedAt: string;
  participantCount: number;
  speakerCount: number;
  agoraChannelName: string;
  myRole: LiveParticipantRole | null;
  myMicrophoneEnabled: boolean;
  hasPendingSpeakRequest: boolean;
  openMic: boolean;
};

export type LiveParticipantDto = {
  user: UserSummaryDto | null;
  role: LiveParticipantRole;
  microphoneEnabled: boolean;
  screenSharing: boolean;
  requestedToSpeakAt: string | null;
  joinedAt: string;
};

export type LiveTokenDto = { appId: string; channelName: string; token: string; uid: string; role: "PUBLISHER" | "SUBSCRIBER" };

export type StartLiveRequest = { title?: string; description?: string; announcement?: string };
export type UpdateLiveRequest = { title?: string; description?: string; announcement?: string; openMic?: boolean };

export type LiveEventType =
  | "CHAT_LIVE_STARTED"
  | "CHAT_LIVE_ENDED"
  | "CHAT_LIVE_UPDATED"
  | "CHAT_LIVE_PARTICIPANT_JOINED"
  | "CHAT_LIVE_PARTICIPANT_LEFT"
  | "CHAT_LIVE_SPEAKING_REQUESTED"
  | "CHAT_LIVE_SPEAKING_APPROVED"
  | "CHAT_LIVE_SPEAKING_REJECTED"
  | "CHAT_LIVE_PARTICIPANT_PROMOTED"
  | "CHAT_LIVE_PARTICIPANT_DEMOTED"
  | "CHAT_LIVE_MICROPHONE_CHANGED"
  | "CHAT_LIVE_SCREEN_SHARE_STARTED"
  | "CHAT_LIVE_SCREEN_SHARE_STOPPED"
  | "CHAT_ROOM_UPDATED"
  | "CHAT_ROOM_APPEARANCE_UPDATED";

export type LiveEventDto<TPayload = unknown> = {
  eventId: string;
  type: LiveEventType;
  roomId: string;
  liveSessionId: string | null;
  occurredAt: string;
  payload: TPayload;
};

export type ChatRoomLastMessageDto = {
  body: string | null;
  hasImage: boolean;
  senderId: string;
  createdAt: string;
};

export type VoiceTokenDto = {
  appId: string;
  channelName: string;
  token: string;
  uid: string;
};

export type VoiceParticipantsDto = {
  participants: UserSummaryDto[];
};

export type MessageReplyPreviewDto = {
  id: string;
  authorName: string | null;
  bodyPreview: string | null;
  deleted: boolean;
};

export type MessageStickerPreviewDto = { id: string; imageUrl: string };

/** userIds en vez de un booleano "reactedByMe" resuelto server-side a propósito: este mismo DTO
 * se reenvía tal cual por WebSocket a todos los suscriptos de la sala (ver
 * ChatService.broadcastMessage en menzoapi), así que un booleano ya calculado sería incorrecto
 * para cualquier cliente que no sea quien reaccionó — cada cliente compara su propio id contra
 * esta lista (ver mapMessage). */
export type MessageReactionDto = { emoji: string; count: number; userIds: string[] };

export type MessageDto = {
  id: string;
  roomId: string;
  authorId: string;
  author: UserSummaryDto | null;
  type: MessageType;
  body: string;
  imageUri: string | null;
  createdAt: string;
  replyTo: MessageReplyPreviewDto | null;
  deleted: boolean;
  sticker: MessageStickerPreviewDto | null;
  reactions: MessageReactionDto[];
};

export type SendMessageRequest = {
  body?: string;
  imageUri?: string;
  replyToMessageId?: string;
  stickerId?: string;
};

export type WallMessageDto = {
  id: string;
  profileId: string;
  author: UserSummaryDto;
  body: string;
  imageUri: string | null;
  createdAt: string;
  commentCount: number;
};

export type WallCommentDto = {
  id: string;
  wallMessageId: string;
  parentCommentId: string | null;
  author: UserSummaryDto;
  body: string;
  imageUri: string | null;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
};

export type WallCommentEventDto = {
  type: "created" | "deleted";
  comment: WallCommentDto | null;
  deletedCommentId: string | null;
};

export type CommunityConfigDto = {
  name: string;
  subtitle: string;
  description: string;
  motto: string;
  memberCount: number;
  onlineCount: number;
  tags: string[];
};

export type NotificationDto = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  createdAt: string;
  read: boolean;
  relatedPostId: string | null;
  relatedRoomId: string | null;
  relatedUserId: string | null;
  relatedEventId: string | null;
  relatedMatchId: string | null;
};

export type AuraDto = { id: string; name: string; description: string; gradient: string };
export type InterestDto = { id: string; label: string; icon: string; gradient: string };
export type BadgeDto = { id: string; name: string; description: string; icon: string; gradient: string };

export type SettingsDto = {
  theme: string;
  effectIntensity: string;
  hapticsEnabled: boolean;
  notificationsEnabled: boolean;
  animationsEnabled: boolean;
  showSimulatedActivity: boolean;
  confirmationsEnabled: boolean;
  showOnlineStatus: boolean;
  allowProfileVisits: boolean;
  showInterests: boolean;
};

export type UpdateSettingsRequest = Partial<SettingsDto>;

export type RecentlyViewedDto = { kind: ActivityKind; id: string; viewedAt: string };
export type UploadResponseDto = { url: string };

// ---- GIFs (Tenor, proxeado — ver TenorController en menzoapi) ---------------------------------
export type GifResultDto = { id: string; url: string; previewUrl: string; width: number | null; height: number | null };
export type GifSearchResponseDto = { results: GifResultDto[]; next: string | null };

// ---- DJ Menzi (música sincronizada del LIVE, YouTube) -----------------------------------------
// DJ Menzi no es un usuario ni un participante de Agora — es este módulo. Ver MusicService en
// menzoapi para la arquitectura completa (estado canónico, cola, solicitudes).

export type YoutubeSearchResultDto = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  embeddable: boolean;
  live: boolean;
};

export type QueueItemStatus = "PENDING" | "QUEUED" | "PLAYING" | "PLAYED" | "SKIPPED" | "REJECTED" | "REMOVED";

export type QueueItemDto = {
  id: string;
  videoId: string;
  title: string | null;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  requestedBy: UserSummaryDto | null;
  approvedBy: UserSummaryDto | null;
  position: number | null;
  status: QueueItemStatus;
  createdAt: string;
};

export type MusicSessionStatus = "IDLE" | "PLAYING" | "PAUSED" | "STOPPED" | "ERROR";

export type MusicSessionDto = {
  musicSessionId: string;
  roomId: string;
  liveSessionId: string;
  status: MusicSessionStatus;
  currentQueueItemId: string | null;
  currentVideoId: string | null;
  currentTitle: string | null;
  currentChannelTitle: string | null;
  currentThumbnailUrl: string | null;
  durationSeconds: number | null;
  /** Ya calculada por el backend (elapsed desde playbackStartedAt) — nunca calcular esto en el
   * cliente a partir del reloj local, ver sección 10 del pedido. */
  positionSeconds: number;
  allowRequests: boolean;
  version: number;
  queue: QueueItemDto[];
  pendingRequests: QueueItemDto[];
  history: QueueItemDto[];
};

export type AddQueueItemRequest = { videoId: string; expectedVersion?: number; playNow?: boolean };
export type RequestSongRequest = { videoId: string };
export type SeekRequest = { positionSeconds: number; expectedVersion?: number };
export type VersionedRequest = { expectedVersion?: number };
export type ReorderQueueRequest = { orderedQueueItemIds: string[]; expectedVersion?: number };
export type MusicSettingsRequest = { allowRequests?: boolean };

export type MusicEventType =
  | "LIVE_MUSIC_SESSION_CREATED"
  | "LIVE_MUSIC_SEARCH_FAILED"
  | "LIVE_MUSIC_REQUESTED"
  | "LIVE_MUSIC_REQUEST_APPROVED"
  | "LIVE_MUSIC_REQUEST_REJECTED"
  | "LIVE_MUSIC_QUEUE_UPDATED"
  | "LIVE_MUSIC_TRACK_ADDED"
  | "LIVE_MUSIC_STARTED"
  | "LIVE_MUSIC_PAUSED"
  | "LIVE_MUSIC_RESUMED"
  | "LIVE_MUSIC_SEEKED"
  | "LIVE_MUSIC_SKIPPED"
  | "LIVE_MUSIC_TRACK_CHANGED"
  | "LIVE_MUSIC_STOPPED"
  | "LIVE_MUSIC_SETTINGS_UPDATED"
  | "LIVE_MUSIC_ERROR";

export type MusicEventDto<TPayload = unknown> = {
  eventId: string;
  type: MusicEventType;
  roomId: string;
  liveSessionId: string;
  musicSessionId: string;
  version: number;
  occurredAt: string;
  payload: TPayload;
};

// ---- Staff global (MASTER/LEADER/CURATOR) — panel de administración ---------------------------

export type ReasonRequest = { reason: string };
export type ChangeRoleRequest = { role: GlobalRole; reason: string };
export type AddUserTitleRequest = { text: string; color: string };

export type ModerationActionType =
  | "SUSPEND_USER"
  | "UNSUSPEND_USER"
  | "DELETE_ACCOUNT"
  | "DELETE_POST"
  | "EDIT_POST"
  | "HIDE_POST"
  | "UNHIDE_POST"
  | "DELETE_MESSAGE"
  | "KICK_FROM_LIVE"
  | "PROMOTE_ROLE"
  | "DEMOTE_ROLE"
  | "DELETE_STICKER_PACK";

export type ModerationActionDto = {
  id: string;
  actor: UserSummaryDto;
  actionType: ModerationActionType;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
};

// ---- Seguridad: cola de moderación automática y audit log (ver com.menzo.menzo.security.moderation
// en menzoapi) — a diferencia de ModerationAction (arriba), esto no lo genera un humano, lo genera
// la pipeline de contenido (FASE A-D). Vacío hasta que esa pipeline se conecte a endpoints reales.

export type ModerationQueueStatus = "PENDING" | "DISMISSED" | "ACTIONED";

export type ModerationQueueItemDto = {
  id: string;
  contentType: string;
  contentId: string | null;
  author: UserSummaryDto | null;
  contentSnapshot: string | null;
  riskLevel: string;
  reasons: string[];
  status: ModerationQueueStatus;
  reviewedBy: UserSummaryDto | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
};

export type SecurityEventType =
  | "CONTENT_BLOCKED"
  | "CONTENT_FLAGGED_FOR_REVIEW"
  | "RATE_LIMITED"
  | "SPAM_DETECTED"
  | "UPLOAD_REJECTED"
  | "IMAGE_MODERATION_FLAGGED"
  | "IDENTIFIER_SPOOF_DETECTED"
  | "PII_DETECTED";

export type SecurityAuditLogDto = {
  id: string;
  eventType: SecurityEventType;
  subject: UserSummaryDto | null;
  contentType: string | null;
  contentId: string | null;
  riskLevel: string | null;
  reasons: string[];
  createdAt: string;
};

// ---- Stickers (packs públicos desde su creación, ver StickerService en menzoapi) --------------

export type StickerDto = { id: string; imageUrl: string; sortOrder: number };

export type StickerPackSummaryDto = {
  id: string;
  name: string;
  creator: UserSummaryDto;
  coverImageUrl: string | null;
  stickerCount: number;
  createdAt: string;
};

export type StickerPackDetailDto = {
  id: string;
  name: string;
  creator: UserSummaryDto;
  stickers: StickerDto[];
  createdAt: string;
};

export type CreateStickerPackRequest = { name: string; imageUrls: string[] };

// ---- Comunidades (Naruto, Anime, etc. — no confundir con /api/community/* singular, que es la
// configuración de Menzo como plataforma única) — ver CommunitiesController en menzoapi. --------

export type CommunityVisibility = "PUBLIC" | "PRIVATE" | "UNLISTED";
export type CommunityAccessType = "OPEN" | "REQUEST" | "INVITE_ONLY";
export type CommunityStatus = "DRAFT" | "ACTIVE" | "ARCHIVED" | "SUSPENDED";
export type CommunityRole = "MEMBER" | "COMMUNITY_CURATOR" | "COMMUNITY_MODERATOR" | "COMMUNITY_ADMIN" | "COMMUNITY_OWNER";
export type CommunityMembershipStatus = "ACTIVE" | "PENDING" | "INVITED" | "LEFT" | "REMOVED" | "BANNED";

export type CommunitySummaryDto = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  category: string | null;
  tags: string[];
  iconUrl: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  memberCount: number;
  featured: boolean;
  official: boolean;
  visibility: CommunityVisibility;
  accessType: CommunityAccessType;
  joined: boolean;
};

export type CommunityMembershipDto = {
  communityRole: CommunityRole;
  membershipStatus: CommunityMembershipStatus;
  joinedAt: string;
  lastVisitedAt: string | null;
  favorite: boolean;
  muted: boolean;
  communityNickname: string | null;
  communityBio: string | null;
  contributionCount: number;
  customTitle: string | null;
};

export type MyCommunityDto = { community: CommunitySummaryDto; membership: CommunityMembershipDto };

/** Shape libre (JSONB en el backend) — estas claves son las que el editor de apariencia conoce
 * hoy (fondos adicionales de feed/chat, estilo de encabezado/tarjetas, lista de URLs de
 * decoraciones tipo marco/insignia/fondo de temporada), pero el backend acepta cualquier clave
 * extra sin necesitar otra migración. */
export type CommunityThemeConfig = {
  headerStyle?: string;
  cardStyle?: string;
  navBackgroundUrl?: string;
  feedBackgroundUrl?: string;
  chatBackgroundUrl?: string;
  decorations?: string[];
  [key: string]: unknown;
};

export type CommunityNavigationSectionKey =
  | "home"
  | "posts"
  | "blogs"
  | "chats"
  | "live"
  | "members"
  | "events"
  | "about";

export type CommunityNavigationSectionConfig = { enabled: boolean; order: number; label: string };

export type CommunityNavigationConfig = Partial<
  Record<CommunityNavigationSectionKey, CommunityNavigationSectionConfig>
>;

export type CommunityDetailDto = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  fullDescription: string | null;
  status: CommunityStatus;
  visibility: CommunityVisibility;
  accessType: CommunityAccessType;
  primaryLanguage: string | null;
  category: string | null;
  tags: string[];
  iconUrl: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
  textColor: string | null;
  surfaceColor: string | null;
  memberCount: number;
  onlineMemberCount: number;
  postCount: number;
  chatCount: number;
  featured: boolean;
  official: boolean;
  allowJoinRequests: boolean;
  allowPublicChats: boolean;
  allowBlogs: boolean;
  allowVoiceRooms: boolean;
  allowMemberPosts: boolean;
  minimumGlobalLevelToJoin: number;
  minimumGlobalLevelToPost: number;
  themeConfig: CommunityThemeConfig;
  navigationConfig: CommunityNavigationConfig;
  createdAt: string;
  myMembership: CommunityMembershipDto | null;
};

/** Cadena vacía "" limpia el campo; omitirlo lo deja sin cambios — mismo criterio que
 * UpdateRoomRequest. */
export type UpdateCommunityAppearanceRequest = {
  iconUrl?: string;
  logoUrl?: string;
  coverUrl?: string;
  backgroundUrl?: string;
  bannerUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
};

/** Reemplazo completo del mapa — no parcial. */
export type UpdateCommunityThemeRequest = { themeConfig: CommunityThemeConfig };
export type UpdateCommunityNavigationRequest = { navigationConfig: CommunityNavigationConfig };

// ---- Menzo Games (ver com.menzo.menzo.game en menzoapi) — arquitectura genérica de partidas,
// `state`/`action` son de forma libre (distinta por juego), este cliente solo los pasa de largo.
// Sin matchmaking: se desafía a un usuario puntual (opponentId), no hay cola pública.

export type GameType = "TIC_TAC_TOE";
export type MatchStatus = "IN_PROGRESS" | "FINISHED" | "ABANDONED";

export type MatchPlayerSummaryDto = { user: UserSummaryDto; playerIndex: number };

export type MatchResponseDto = {
  id: string;
  gameType: GameType;
  status: MatchStatus;
  state: unknown;
  version: number;
  players: MatchPlayerSummaryDto[];
  winnerId: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

export type CreateMatchRequest = { gameType: GameType; opponentId: string };
export type MatchActionRequest = { action: unknown; expectedVersion?: number };

export type GameEventType = "MATCH_CREATED" | "MATCH_STATE_UPDATED" | "MATCH_FINISHED";
export type GameEventDto = {
  type: GameEventType;
  matchId: string;
  gameType: GameType;
  version: number;
  payload: MatchResponseDto;
};

// Forma real de MatchResponseDto.state/MatchActionRequest.action para TIC_TAC_TOE — no viene
// tipado desde el backend (es JSON libre), pero esta SÍ es la forma exacta que produce/espera
// TicTacToeEngine (ver TicTacToeState/TicTacToeAction en menzoapi).
export type TicTacToeStateDto = { players: string[]; board: (string | null)[]; currentPlayerIndex: number };
export type TicTacToeActionDto = { cell: number };
