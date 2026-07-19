import type {
  ChatRoom,
  Comment,
  CommunityEvent,
  DemoUser,
  Message,
  Notification,
  Post,
  UserProfile,
  WallMessage,
} from "@/lib/types";

export type RecentlyViewedEntry = { kind: "post" | "member"; id: string; at: string };

export type SocialState = {
  users: DemoUser[];
  posts: Post[];
  comments: Comment[];
  rooms: ChatRoom[];
  messages: Message[];
  wallMessages: WallMessage[];
  events: CommunityEvent[];
  notifications: Notification[];
  following: string[];
  recentlyViewed: RecentlyViewedEntry[];
  recentSearches: string[];
};

export type AppState = {
  isHydrated: boolean;
  profile: UserProfile | null;
  onboardingCompleted: boolean;
  social: SocialState;
};

export type OnboardingPayload = {
  displayName: string;
  aura: UserProfile["aura"];
  avatarUri?: string;
  avatarFile?: File;
  avatarGradient: UserProfile["avatarGradient"];
  interests: UserProfile["interests"];
};
