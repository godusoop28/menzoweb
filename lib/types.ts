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
};

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

export type CommunityEvent = {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  kind: string;
  attendees: string[];
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
};

export type Comment = { id: string; postId: string; authorId: string; body: string; createdAt: string };

export type MessageType = "text" | "system";

export type Message = {
  id: string;
  roomId: string;
  authorId: string;
  body: string;
  createdAt: string;
  type: MessageType;
  imageUri?: string;
};

export type ChatRoomType = "public" | "direct";

export type ChatPeer = {
  id: string;
  displayName: string;
  username: string;
  avatarUri?: string;
  avatarGradient: GradientId;
  isOnline: boolean;
};

export type ChatRoom = {
  id: string;
  type: ChatRoomType;
  name: string;
  description: string;
  topic: string;
  gradient: GradientId;
  icon: string;
  coverUri?: string;
  backgroundUri?: string;
  memberIds: string[];
  onlineCount: number;
  favorite: boolean;
  joined: boolean;
  createdAt: string;
  peer?: ChatPeer;
  lastMessage?: ChatRoomLastMessage;
};

export type ChatRoomLastMessage = {
  body: string;
  hasImage: boolean;
  senderId: string;
  createdAt: string;
};

export type WallMessage = {
  id: string;
  profileId: string;
  authorId: string;
  body: string;
  createdAt: string;
  commentCount: number;
};

export type WallComment = {
  id: string;
  wallMessageId: string;
  authorId: string;
  body: string;
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
