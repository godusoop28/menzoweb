import type { Comment, Post, UserProfile, WallMessage } from "@/lib/types";

import { LOCAL_USER_ID } from "./localUser";
import type { AppState, SocialState } from "./types";

export function createDefaultSocialState(): SocialState {
  return { users: [], posts: [], comments: [], rooms: [], messages: [], wallMessages: [], following: [] };
}

export function createDefaultState(): AppState {
  return { isHydrated: false, profile: null, onboardingCompleted: false, social: createDefaultSocialState() };
}

type MergeableSocialState = Pick<SocialState, "users" | "posts" | "comments" | "messages" | "wallMessages" | "rooms">;

export type Action =
  | { type: "HYDRATE"; payload: AppState }
  | { type: "SET_SESSION"; payload: { profile: UserProfile; onboardingCompleted: boolean } }
  | { type: "LOGOUT" }
  | { type: "SET_SOCIAL_BULK"; payload: Partial<SocialState> }
  | { type: "MERGE_SOCIAL"; payload: Partial<MergeableSocialState> }
  | { type: "UPDATE_PROFILE"; payload: Partial<UserProfile> }
  | { type: "TOGGLE_LIKE"; payload: { postId: string } }
  | { type: "TOGGLE_BOOKMARK"; payload: { postId: string } }
  | { type: "CREATE_POST"; payload: Post }
  | { type: "ADD_COMMENT"; payload: Comment }
  | { type: "ADD_WALL_MESSAGE"; payload: WallMessage }
  | { type: "TOGGLE_FOLLOW"; payload: { userId: string } }
  | { type: "SEND_MESSAGE"; payload: import("@/lib/types").Message }
  | { type: "TOGGLE_FAVORITE_ROOM"; payload: { roomId: string } };

function nextLevel(xp: number) {
  return Math.floor(xp / 500) + 1;
}

function mergeById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "HYDRATE":
      return { ...action.payload, isHydrated: true };

    case "SET_SESSION": {
      const { profile, onboardingCompleted } = action.payload;
      return {
        ...state,
        profile,
        onboardingCompleted,
        social: {
          ...state.social,
          users: [
            { ...profile, activityStatus: profile.statusText },
            ...state.social.users.filter((u) => u.id !== profile.id),
          ],
        },
      };
    }

    case "LOGOUT":
      return { ...state, profile: null, onboardingCompleted: false, social: createDefaultSocialState() };

    case "SET_SOCIAL_BULK":
      return { ...state, social: { ...state.social, ...action.payload } };

    case "MERGE_SOCIAL": {
      const p = action.payload;
      return {
        ...state,
        social: {
          ...state.social,
          users: p.users ? mergeById(state.social.users, p.users) : state.social.users,
          posts: p.posts ? mergeById(state.social.posts, p.posts) : state.social.posts,
          comments: p.comments ? mergeById(state.social.comments, p.comments) : state.social.comments,
          messages: p.messages ? mergeById(state.social.messages, p.messages) : state.social.messages,
          wallMessages: p.wallMessages ? mergeById(state.social.wallMessages, p.wallMessages) : state.social.wallMessages,
          rooms: p.rooms ? mergeById(state.social.rooms, p.rooms) : state.social.rooms,
        },
      };
    }

    case "UPDATE_PROFILE": {
      if (!state.profile) return state;
      const updatedProfile = { ...state.profile, ...action.payload };
      return {
        ...state,
        profile: updatedProfile,
        social: {
          ...state.social,
          users: state.social.users.map((u) =>
            u.id === LOCAL_USER_ID ? { ...u, ...updatedProfile, activityStatus: updatedProfile.statusText } : u
          ),
        },
      };
    }

    case "TOGGLE_LIKE": {
      const { postId } = action.payload;
      return {
        ...state,
        social: {
          ...state.social,
          posts: state.social.posts.map((post) => {
            if (post.id !== postId) return post;
            const liked = post.likes.includes(LOCAL_USER_ID);
            return {
              ...post,
              likes: liked ? post.likes.filter((id) => id !== LOCAL_USER_ID) : [...post.likes, LOCAL_USER_ID],
            };
          }),
        },
      };
    }

    case "TOGGLE_BOOKMARK": {
      const { postId } = action.payload;
      return {
        ...state,
        social: {
          ...state.social,
          posts: state.social.posts.map((post) => {
            if (post.id !== postId) return post;
            const saved = post.bookmarkedBy.includes(LOCAL_USER_ID);
            return {
              ...post,
              bookmarkedBy: saved
                ? post.bookmarkedBy.filter((id) => id !== LOCAL_USER_ID)
                : [...post.bookmarkedBy, LOCAL_USER_ID],
            };
          }),
        },
      };
    }

    case "CREATE_POST": {
      const gainedXp = 15;
      const xp = (state.profile?.xp ?? 0) + gainedXp;
      const updatedProfile = state.profile ? { ...state.profile, xp, level: nextLevel(xp) } : state.profile;
      return {
        ...state,
        profile: updatedProfile,
        social: {
          ...state.social,
          posts: [action.payload, ...state.social.posts],
          users: state.social.users.map((u) =>
            u.id === LOCAL_USER_ID && updatedProfile ? { ...u, xp, level: nextLevel(xp) } : u
          ),
        },
      };
    }

    case "ADD_COMMENT": {
      const comment = action.payload;
      return {
        ...state,
        social: {
          ...state.social,
          comments: [...state.social.comments, comment],
          posts: state.social.posts.map((p) => (p.id === comment.postId ? { ...p, commentCount: p.commentCount + 1 } : p)),
        },
      };
    }

    case "ADD_WALL_MESSAGE":
      return { ...state, social: { ...state.social, wallMessages: [action.payload, ...state.social.wallMessages] } };

    case "TOGGLE_FOLLOW": {
      const { userId } = action.payload;
      const isFollowing = state.social.following.includes(userId);
      const following = isFollowing
        ? state.social.following.filter((id) => id !== userId)
        : [...state.social.following, userId];
      return {
        ...state,
        social: {
          ...state.social,
          following,
          users: state.social.users.map((u) =>
            u.id === userId ? { ...u, followers: u.followers + (isFollowing ? -1 : 1) } : u
          ),
        },
      };
    }

    case "SEND_MESSAGE":
      return { ...state, social: { ...state.social, messages: [...state.social.messages, action.payload] } };

    case "TOGGLE_FAVORITE_ROOM": {
      const { roomId } = action.payload;
      return {
        ...state,
        social: {
          ...state.social,
          rooms: state.social.rooms.map((r) => (r.id === roomId ? { ...r, favorite: !r.favorite } : r)),
        },
      };
    }

    default:
      return state;
  }
}
