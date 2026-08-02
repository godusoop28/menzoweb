import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { Gradients, type GradientId } from "@/lib/theme";
import type {
  AbstractVisualPreset,
  ChatRoom,
  ChatRoomRole,
  Comment,
  CommunityEvent,
  DemoUser,
  Message,
  ModerationAction,
  Notification,
  Post,
  Sticker,
  StickerPackDetail,
  StickerPackSummary,
  UserProfile,
  WallComment,
  WallMessage,
} from "@/lib/types";

import type {
  BanDto,
  ChatRoomDto,
  CommentDto,
  EventDto,
  MessageDto,
  ModerationActionDto,
  NotificationDto,
  PostDto,
  RoomMemberDto,
  StickerDto,
  StickerPackDetailDto,
  StickerPackSummaryDto,
  UserProfileDto,
  UserSummaryDto,
  WallCommentDto,
  WallMessageDto,
} from "./types";

/**
 * La UI fue construida asumiendo un único usuario local identificado con LOCAL_USER_ID.
 * Como la API sí es multiusuario (IDs UUID reales), toda respuesta que mencione al usuario
 * autenticado se "traduce" a LOCAL_USER_ID acá, en el borde API→estado local.
 */
function alias(id: string, myRealId: string | null): string {
  return myRealId && id === myRealId ? LOCAL_USER_ID : id;
}

function synthArray(count: number, includeMe: boolean): string[] {
  return Array.from({ length: Math.max(count, 0) }, (_, i) => (includeMe && i === 0 ? LOCAL_USER_ID : `other-${i}`));
}

function toGradient(value: string | null | undefined, fallback: GradientId = "fire"): GradientId {
  return value && value in Gradients ? (value as GradientId) : fallback;
}

export function mapUserProfile(dto: UserProfileDto, myRealId: string | null): UserProfile {
  return {
    id: alias(dto.id, myRealId),
    displayName: dto.displayName,
    username: dto.username,
    avatarUri: dto.avatarUri ?? undefined,
    avatarGradient: toGradient(dto.avatarGradient),
    coverUri: dto.coverUri ?? undefined,
    backgroundUri: dto.backgroundUri ?? undefined,
    backgroundColor: dto.backgroundColor ?? undefined,
    aura: dto.aura as UserProfile["aura"],
    bio: dto.bio ?? "",
    statusText: dto.statusText ?? "",
    interests: dto.interests as UserProfile["interests"],
    joinedAt: dto.joinedAt,
    level: dto.level,
    xp: dto.xp,
    reputation: dto.reputation,
    followers: dto.followers,
    following: dto.following,
    visitors: dto.visitors,
    isOnline: dto.isOnline,
    badges: dto.badges,
    isLocalUser: !!myRealId && dto.id === myRealId,
    followedByMe: dto.followedByMe,
    followsMe: dto.followsMe,
    areFriends: dto.areFriends,
    relationshipStatus: dto.relationshipStatus,
    globalRole: dto.globalRole,
  };
}

export function mapRoomMember(dto: RoomMemberDto, myRealId: string | null): import("@/lib/types").RoomMember {
  return { user: mapUserSummary(dto.user, myRealId), role: dto.role.toLowerCase() as ChatRoomRole, joinedAt: dto.joinedAt };
}

export function mapBan(dto: BanDto, myRealId: string | null): import("@/lib/types").RoomBan {
  return {
    user: mapUserSummary(dto.user, myRealId),
    reason: dto.reason,
    createdAt: dto.createdAt,
    bannedBy: dto.bannedBy ? mapUserSummary(dto.bannedBy, myRealId) : null,
  };
}

export function mapDemoUser(dto: UserProfileDto, myRealId: string | null): DemoUser {
  return { ...mapUserProfile(dto, myRealId), activityStatus: dto.statusText ?? "" };
}

export function mapUserSummary(dto: UserSummaryDto, myRealId: string | null): DemoUser {
  return {
    id: alias(dto.id, myRealId),
    displayName: dto.displayName,
    username: dto.username,
    avatarUri: dto.avatarUri ?? undefined,
    avatarGradient: toGradient(dto.avatarGradient),
    aura: "fuego",
    bio: "",
    statusText: "",
    interests: [],
    joinedAt: new Date().toISOString(),
    level: 1,
    xp: 0,
    reputation: 0,
    followers: 0,
    following: 0,
    visitors: 0,
    isOnline: dto.isOnline,
    badges: [],
    isLocalUser: !!myRealId && dto.id === myRealId,
    activityStatus: "",
    // UserSummaryDto no trae el rol (es un resumen liviano) — el rol real se conoce a través de
    // UserProfileDto (perfil completo). Se resuelve por separado donde haga falta el rol exacto
    // de un tercero (p. ej. panel de admin, que siempre pide el perfil completo).
    globalRole: "USER",
  };
}

export function mapPost(dto: PostDto, myRealId: string | null): Post {
  return {
    id: dto.id,
    authorId: alias(dto.author.id, myRealId),
    type: dto.type,
    title: dto.title ?? undefined,
    body: dto.body,
    abstractVisual: dto.abstractVisual
      ? { preset: dto.abstractVisual.preset as AbstractVisualPreset, caption: dto.abstractVisual.caption ?? undefined }
      : undefined,
    imageUri: dto.imageUri ?? undefined,
    createdAt: dto.createdAt,
    likes: synthArray(dto.likeCount, dto.likedByMe),
    bookmarkedBy: dto.bookmarkedByMe ? [LOCAL_USER_ID] : [],
    commentCount: dto.commentCount,
    featured: dto.featured,
    tags: dto.tags,
    pollOptions:
      dto.pollOptions.length > 0
        ? dto.pollOptions.map((o) => ({ id: o.id, label: o.label, votes: synthArray(o.voteCount, o.votedByMe) }))
        : undefined,
    eventId: dto.eventId ?? undefined,
    gradient: toGradient(dto.gradient),
    blocks: dto.blocks ?? [],
    hidden: dto.hidden,
  };
}

export function mapComment(dto: CommentDto, myRealId: string | null): Comment {
  return {
    id: dto.id,
    postId: dto.postId,
    authorId: alias(dto.author.id, myRealId),
    body: dto.body,
    createdAt: dto.createdAt,
  };
}

export function mapWallMessage(dto: WallMessageDto, myRealId: string | null): WallMessage {
  return {
    id: dto.id,
    profileId: dto.profileId,
    authorId: alias(dto.author.id, myRealId),
    body: dto.body,
    imageUri: dto.imageUri ?? undefined,
    createdAt: dto.createdAt,
    commentCount: dto.commentCount,
  };
}

export function mapWallComment(dto: WallCommentDto, myRealId: string | null): WallComment {
  return {
    id: dto.id,
    wallMessageId: dto.wallMessageId,
    parentCommentId: dto.parentCommentId ?? undefined,
    authorId: alias(dto.author.id, myRealId),
    body: dto.body,
    imageUri: dto.imageUri ?? undefined,
    createdAt: dto.createdAt,
    likeCount: dto.likeCount,
    likedByMe: dto.likedByMe,
  };
}

export function mapChatRoom(dto: ChatRoomDto, myRealId: string | null = null): ChatRoom {
  const isDirect = dto.type === "DIRECT";
  return {
    id: dto.id,
    type: isDirect ? "direct" : "public",
    name: dto.name ?? dto.peer?.displayName ?? "Conversación",
    description: dto.description ?? null,
    topic: dto.topic ?? "",
    gradient: toGradient(dto.gradient, "connection"),
    icon: dto.icon ?? "chatbubbles",
    avatarUri: dto.avatarUri ?? undefined,
    coverUri: dto.coverUri ?? undefined,
    backgroundUri: dto.backgroundUri ?? undefined,
    category: dto.category ?? null,
    maxMembers: dto.maxMembers ?? null,
    requiresApproval: dto.requiresApproval,
    allowMembersToInvite: dto.allowMembersToInvite,
    listed: dto.listed,
    memberIds: synthArray(dto.memberCount, dto.joined),
    onlineCount: dto.onlineCount,
    favorite: dto.favorite,
    joined: dto.joined,
    role: dto.role ? (dto.role.toLowerCase() as ChatRoomRole) : null,
    live: dto.live,
    liveSummary: dto.liveSummary
      ? {
          liveSessionId: dto.liveSummary.liveSessionId,
          title: dto.liveSummary.title,
          announcement: dto.liveSummary.announcement,
          participantCount: dto.liveSummary.participantCount,
          speakerCount: dto.liveSummary.speakerCount,
          host: dto.liveSummary.host
            ? {
                id: alias(dto.liveSummary.host.id, myRealId),
                displayName: dto.liveSummary.host.displayName,
                username: dto.liveSummary.host.username,
                avatarUri: dto.liveSummary.host.avatarUri ?? undefined,
                avatarGradient: toGradient(dto.liveSummary.host.avatarGradient),
                isOnline: dto.liveSummary.host.isOnline,
              }
            : null,
        }
      : null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt ?? null,
    peer: dto.peer
      ? {
          id: alias(dto.peer.id, myRealId),
          displayName: dto.peer.displayName,
          username: dto.peer.username,
          avatarUri: dto.peer.avatarUri ?? undefined,
          avatarGradient: toGradient(dto.peer.avatarGradient),
          isOnline: dto.peer.isOnline,
        }
      : undefined,
    lastMessage: dto.lastMessage
      ? {
          body: dto.lastMessage.body ?? "",
          hasImage: dto.lastMessage.hasImage,
          senderId: dto.lastMessage.senderId === "system" ? "system" : alias(dto.lastMessage.senderId, myRealId),
          createdAt: dto.lastMessage.createdAt,
        }
      : undefined,
  };
}

export function mapLiveSession(dto: import("./types").LiveSessionDto): import("@/lib/types").LiveSessionSummary {
  return {
    id: dto.id,
    roomId: dto.roomId,
    status: dto.status === "ACTIVE" ? "active" : "ended",
    title: dto.title,
    description: dto.description,
    announcement: dto.announcement,
    startedByUserId: dto.startedByUserId,
    startedAt: dto.startedAt,
    participantCount: dto.participantCount,
    speakerCount: dto.speakerCount,
    myRole: dto.myRole ? (dto.myRole.toLowerCase() as import("@/lib/types").LiveParticipantRole) : null,
    myMicrophoneEnabled: dto.myMicrophoneEnabled,
    hasPendingSpeakRequest: dto.hasPendingSpeakRequest,
  };
}

export function mapLiveParticipant(
  dto: import("./types").LiveParticipantDto,
  myRealId: string | null
): import("@/lib/types").LiveParticipant | null {
  if (!dto.user) return null;
  return {
    user: mapUserSummary(dto.user, myRealId),
    role: dto.role.toLowerCase() as import("@/lib/types").LiveParticipantRole,
    microphoneEnabled: dto.microphoneEnabled,
    screenSharing: dto.screenSharing,
    requestedToSpeakAt: dto.requestedToSpeakAt,
    joinedAt: dto.joinedAt,
    speakingLevel: 0,
  };
}

export function mapMessage(dto: MessageDto, myRealId: string | null): Message {
  return {
    id: dto.id,
    roomId: dto.roomId,
    authorId: dto.authorId === "system" ? "system" : alias(dto.authorId, myRealId),
    body: dto.body,
    createdAt: dto.createdAt,
    // Se captura una sola vez acá, al construir el mensaje — nunca en el comparador de sort.
    receivedAt: Date.now(),
    type: dto.type,
    imageUri: dto.imageUri ?? undefined,
    replyTo: dto.replyTo,
    deleted: dto.deleted,
    sticker: dto.sticker ? { id: dto.sticker.id, imageUrl: dto.sticker.imageUrl } : null,
  };
}

export function mapEvent(dto: EventDto): CommunityEvent {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    date: dto.date,
    time: dto.time,
    kind: dto.kind,
    attendees: synthArray(dto.attendeeCount, dto.attendingByMe),
  };
}

export function mapQueueItem(
  dto: import("./types").QueueItemDto,
  myRealId: string | null
): import("@/lib/types").QueueItem {
  return {
    id: dto.id,
    videoId: dto.videoId,
    title: dto.title ?? "",
    channelTitle: dto.channelTitle ?? "",
    thumbnailUrl: dto.thumbnailUrl,
    durationSeconds: dto.durationSeconds,
    requestedBy: dto.requestedBy ? mapUserSummary(dto.requestedBy, myRealId) : null,
    approvedBy: dto.approvedBy ? mapUserSummary(dto.approvedBy, myRealId) : null,
    position: dto.position,
    status: dto.status.toLowerCase() as import("@/lib/types").QueueItemStatus,
    createdAt: dto.createdAt,
  };
}

export function mapMusicSession(
  dto: import("./types").MusicSessionDto,
  myRealId: string | null
): import("@/lib/types").MusicSessionSummary {
  return {
    musicSessionId: dto.musicSessionId,
    roomId: dto.roomId,
    liveSessionId: dto.liveSessionId,
    status: dto.status.toLowerCase() as import("@/lib/types").MusicSessionSummary["status"],
    currentQueueItemId: dto.currentQueueItemId,
    currentVideoId: dto.currentVideoId,
    currentTitle: dto.currentTitle,
    currentChannelTitle: dto.currentChannelTitle,
    currentThumbnailUrl: dto.currentThumbnailUrl,
    durationSeconds: dto.durationSeconds,
    positionSeconds: dto.positionSeconds,
    allowRequests: dto.allowRequests,
    version: dto.version,
    queue: dto.queue.map((q) => mapQueueItem(q, myRealId)),
    pendingRequests: dto.pendingRequests.map((q) => mapQueueItem(q, myRealId)),
    history: dto.history.map((q) => mapQueueItem(q, myRealId)),
  };
}

export function mapYoutubeSearchResult(dto: import("./types").YoutubeSearchResultDto): import("@/lib/types").YoutubeSearchResult {
  return {
    videoId: dto.videoId,
    title: dto.title,
    channelTitle: dto.channelTitle,
    thumbnailUrl: dto.thumbnailUrl,
    durationSeconds: dto.durationSeconds,
    embeddable: dto.embeddable,
    live: dto.live,
  };
}

export function mapModerationAction(dto: ModerationActionDto, myRealId: string | null): ModerationAction {
  return {
    id: dto.id,
    actor: mapUserSummary(dto.actor, myRealId),
    actionType: dto.actionType,
    targetType: dto.targetType,
    targetId: dto.targetId,
    reason: dto.reason,
    createdAt: dto.createdAt,
  };
}

export function mapSticker(dto: StickerDto): Sticker {
  return { id: dto.id, imageUrl: dto.imageUrl, sortOrder: dto.sortOrder };
}

export function mapStickerPackSummary(dto: StickerPackSummaryDto, myRealId: string | null): StickerPackSummary {
  return {
    id: dto.id,
    name: dto.name,
    creator: mapUserSummary(dto.creator, myRealId),
    coverImageUrl: dto.coverImageUrl,
    stickerCount: dto.stickerCount,
    createdAt: dto.createdAt,
  };
}

export function mapStickerPackDetail(dto: StickerPackDetailDto, myRealId: string | null): StickerPackDetail {
  return {
    id: dto.id,
    name: dto.name,
    creator: mapUserSummary(dto.creator, myRealId),
    stickers: dto.stickers.map(mapSticker),
    createdAt: dto.createdAt,
  };
}

export function mapNotification(dto: NotificationDto, myRealId: string | null): Notification {
  return {
    id: dto.id,
    category: dto.category,
    title: dto.title,
    body: dto.body ?? "",
    createdAt: dto.createdAt,
    read: dto.read,
    relatedPostId: dto.relatedPostId ?? undefined,
    relatedRoomId: dto.relatedRoomId ?? undefined,
    relatedUserId: dto.relatedUserId ? alias(dto.relatedUserId, myRealId) : undefined,
    relatedEventId: dto.relatedEventId ?? undefined,
  };
}
