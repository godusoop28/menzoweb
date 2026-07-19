import type { SocialState } from "./types";

export function findUser(social: SocialState, userId: string | undefined) {
  return social.users.find((u) => u.id === userId);
}

export function findPost(social: SocialState, postId: string) {
  return social.posts.find((p) => p.id === postId);
}

export function findRoom(social: SocialState, roomId: string | undefined) {
  return social.rooms.find((r) => r.id === roomId);
}

export function messagesForRoom(social: SocialState, roomId: string | undefined) {
  return social.messages
    .filter((m) => m.roomId === roomId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function wallMessagesForProfile(social: SocialState, profileId: string) {
  return social.wallMessages
    .filter((w) => w.profileId === profileId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function postsByAuthor(social: SocialState, authorId: string) {
  return social.posts
    .filter((p) => p.authorId === authorId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function savedPosts(social: SocialState, userId: string) {
  return social.posts
    .filter((p) => p.bookmarkedBy.includes(userId))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function featuredPosts(social: SocialState) {
  return social.posts.filter((p) => p.featured);
}

export function recentPosts(social: SocialState) {
  return [...social.posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function onlineUsers(social: SocialState) {
  return social.users.filter((u) => u.isOnline);
}
