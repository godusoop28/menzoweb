import type { GradientId } from "@/lib/theme";

export type AuraId = "fuego" | "tormenta" | "eclipse" | "renacer" | "prisma";

export type InterestId =
  | "anime"
  | "manga"
  | "videojuegos"
  | "arte"
  | "escritura"
  | "futbol"
  | "musica"
  | "nostalgia";

export type Interest = { id: InterestId; label: string; icon: string; gradient: GradientId };
export type Aura = { id: AuraId; name: string; description: string; gradient: GradientId };
export type Badge = { id: string; name: string; description: string; icon: string; gradient: GradientId };

export type GlobalRole = "USER" | "CURATOR" | "LEADER" | "MASTER";

export type UserProfile = {
  id: string;
  displayName: string;
  username: string;
  avatarUri?: string;
  avatarGradient: GradientId;
  coverUri?: string;
  backgroundUri?: string;
  backgroundColor?: string;
  aura: AuraId;
  bio: string;
  statusText: string;
  interests: InterestId[];
  joinedAt: string;
  level: number;
  xp: number;
  reputation: number;
  followers: number;
  following: number;
  visitors: number;
  isOnline: boolean;
  badges: string[];
  isLocalUser?: boolean;
  followedByMe?: boolean;
  followsMe?: boolean;
  areFriends?: boolean;
  relationshipStatus?: RelationshipStatus;
  globalRole: GlobalRole;
};

export type RelationshipStatus = "SELF" | "NONE" | "FOLLOWING" | "FOLLOWS_YOU" | "FRIENDS";

export type DemoUser = UserProfile & { activityStatus: string };

export type PostType = "text" | "image" | "poll" | "question" | "event";

export type AbstractVisualPreset =
  | "fire"
  | "storm"
  | "eclipse"
  | "rebirth"
  | "prism"
  | "midnight"
  | "memory"
  | "community";

export type AbstractVisual = { preset: AbstractVisualPreset; caption?: string };
export type PollOption = { id: string; label: string; votes: string[] };

export type PostBlockType = "paragraph" | "heading" | "image" | "gif" | "divider";
export type PostBlockFontSize = "sm" | "md" | "lg" | "xl";
export type PostBlockFontFamily = "sans" | "serif" | "mono";
export type PostBlockAlign = "left" | "center" | "right";
export type PostBlock = {
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

export type Post = {
  id: string;
  authorId: string;
  type: PostType;
  title?: string;
  body: string;
  abstractVisual?: AbstractVisual;
  imageUri?: string;
  createdAt: string;
  likes: string[];
  bookmarkedBy: string[];
  commentCount: number;
  featured: boolean;
  tags: string[];
  pollOptions?: PollOption[];
  eventId?: string;
  gradient?: GradientId;
  blocks: PostBlock[];
  hidden: boolean;
  communityId: string | null;
};

export type Comment = { id: string; postId: string; authorId: string; body: string; createdAt: string };

export type MessageType = "text" | "system" | "sticker";

export type MessageReplyPreview = {
  id: string;
  authorName: string | null;
  bodyPreview: string | null;
  deleted: boolean;
};

export type MessageStickerPreview = { id: string; imageUrl: string };

/** Ver MessageReactionDto en lib/api/types.ts — sin reactedByMe resuelto acá tampoco, se deriva
 * en el componente comparando userIds contra el id propio (ver ChatBubble). */
export type MessageReaction = { emoji: string; count: number; userIds: string[] };

export type Message = {
  id: string;
  roomId: string;
  authorId: string;
  body: string;
  createdAt: string;
  /** Timestamp local, tomado una sola vez cuando este mensaje se construyó a partir del DTO del
   * servidor (ver mapMessage). Respaldo estable para ordenar si createdAt no se puede parsear —
   * nunca se recalcula en cada sort/render, así que no salta de posición entre renders. */
  receivedAt: number;
  type: MessageType;
  imageUri?: string;
  replyTo: MessageReplyPreview | null;
  deleted: boolean;
  sticker: MessageStickerPreview | null;
  reactions: MessageReaction[];
};

export type ChatRoomType = "public" | "direct";
export type ChatRoomRole = "owner" | "co_host" | "member";

export type ChatPeer = {
  id: string;
  displayName: string;
  username: string;
  avatarUri?: string;
  avatarGradient: GradientId;
  isOnline: boolean;
};

export type ChatRoomLiveSummary = {
  liveSessionId: string;
  title: string | null;
  announcement: string | null;
  participantCount: number;
  speakerCount: number;
  host: ChatPeer | null;
};

export type ChatRoom = {
  id: string;
  type: ChatRoomType;
  name: string;
  /** null = sin descripción; nunca "" (ver ChatService.updateRoom/TextSanitizer en el backend). */
  description: string | null;
  topic: string;
  gradient: GradientId;
  icon: string;
  avatarUri?: string;
  coverUri?: string;
  backgroundUri?: string;
  category: string | null;
  maxMembers: number | null;
  requiresApproval: boolean;
  allowMembersToInvite: boolean;
  listed: boolean;
  memberIds: string[];
  onlineCount: number;
  favorite: boolean;
  joined: boolean;
  role: ChatRoomRole | null;
  live: boolean;
  liveSummary: ChatRoomLiveSummary | null;
  createdAt: string;
  updatedAt: string | null;
  peer?: ChatPeer;
  lastMessage?: ChatRoomLastMessage;
  communityId: string | null;
};

export type ChatRoomLastMessage = {
  body: string;
  hasImage: boolean;
  senderId: string;
  createdAt: string;
};

export type RoomMember = { user: DemoUser; role: ChatRoomRole; joinedAt: string };

export type RoomBan = { user: DemoUser; reason: string | null; createdAt: string; bannedBy: DemoUser | null };

export type WallMessage = {
  id: string;
  profileId: string;
  authorId: string;
  body: string;
  imageUri?: string;
  createdAt: string;
  commentCount: number;
};

export type WallComment = {
  id: string;
  wallMessageId: string;
  parentCommentId?: string;
  authorId: string;
  body: string;
  imageUri?: string;
  createdAt: string;
  likeCount: number;
  likedByMe: boolean;
};

export type NotificationCategory = "comentarios" | "likes" | "mensajes" | "eventos" | "seguimientos";

export type Notification = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  relatedPostId?: string;
  relatedRoomId?: string;
  relatedUserId?: string;
  relatedEventId?: string;
};

// ---- LIVE moderado ----------------------------------------------------------------------------

export type LiveParticipantRole = "host" | "co_host" | "speaker" | "audience" | "requested";

export type LiveParticipant = {
  user: DemoUser;
  role: LiveParticipantRole;
  microphoneEnabled: boolean;
  screenSharing: boolean;
  requestedToSpeakAt: string | null;
  joinedAt: string;
  /** 0-1, viene de Agora (volume-indicator) — nunca del backend, ver LiveRoomContext. */
  speakingLevel: number;
};

export type LiveSessionSummary = {
  id: string;
  roomId: string;
  status: "active" | "ended";
  title: string | null;
  description: string | null;
  announcement: string | null;
  startedByUserId: string | null;
  startedAt: string;
  participantCount: number;
  speakerCount: number;
  myRole: LiveParticipantRole | null;
  myMicrophoneEnabled: boolean;
  hasPendingSpeakRequest: boolean;
};

// ---- DJ Menzi -----------------------------------------------------------------------------

export type QueueItemStatus = "pending" | "queued" | "playing" | "played" | "skipped" | "rejected" | "removed";

export type QueueItem = {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  requestedBy: DemoUser | null;
  approvedBy: DemoUser | null;
  position: number | null;
  status: QueueItemStatus;
  createdAt: string;
};

export type MusicSessionSummary = {
  musicSessionId: string;
  roomId: string;
  liveSessionId: string;
  status: "idle" | "playing" | "paused" | "stopped" | "error";
  currentQueueItemId: string | null;
  currentVideoId: string | null;
  currentTitle: string | null;
  currentChannelTitle: string | null;
  currentThumbnailUrl: string | null;
  durationSeconds: number | null;
  positionSeconds: number;
  allowRequests: boolean;
  version: number;
  queue: QueueItem[];
  pendingRequests: QueueItem[];
  history: QueueItem[];
};

export type YoutubeSearchResult = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  embeddable: boolean;
  live: boolean;
};

// ---- Staff global (MASTER/LEADER/CURATOR) ------------------------------------------------------

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

export type ModerationAction = {
  id: string;
  actor: DemoUser;
  actionType: ModerationActionType;
  targetType: string;
  targetId: string;
  reason: string;
  createdAt: string;
};

// ---- Stickers -------------------------------------------------------------------------------

export type Sticker = { id: string; imageUrl: string; sortOrder: number };

export type StickerPackSummary = {
  id: string;
  name: string;
  creator: DemoUser;
  coverImageUrl: string | null;
  stickerCount: number;
  createdAt: string;
};

export type StickerPackDetail = {
  id: string;
  name: string;
  creator: DemoUser;
  stickers: Sticker[];
  createdAt: string;
};
