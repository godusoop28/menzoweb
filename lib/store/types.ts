import type { ChatRoom, Comment, DemoUser, Message, Post, UserProfile, WallMessage } from "@/lib/types";

export type SocialState = {
  users: DemoUser[];
  posts: Post[];
  comments: Comment[];
  rooms: ChatRoom[];
  messages: Message[];
  wallMessages: WallMessage[];
  following: string[];
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
