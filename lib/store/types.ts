import type {
  ChatRoom,
  Comment,
  DemoUser,
  Message,
  Notification,
  Post,
  UserProfile,
  WallComment,
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
  wallComments: WallComment[];
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
  username: string;
  avatarUri?: string;
  avatarFile?: File;
  avatarGradient: UserProfile["avatarGradient"];
  interests: UserProfile["interests"];
  communityIds: string[];
};
