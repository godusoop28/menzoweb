"use client";

import Link from "next/link";

import { useAppState } from "@/lib/AppStateContext";
import { findUser } from "@/lib/store/selectors";
import type { Post } from "@/lib/types";

import { AbstractArtwork } from "./AbstractArtwork";
import { Avatar } from "./Avatar";

export function FeaturedPostCard({ post, variant = "medium" }: { post: Post; variant?: "hero" | "medium" }) {
  const { state } = useAppState();
  const author = findUser(state.social, post.authorId);
  const isHero = variant === "hero";

  return (
    <Link
      href={`/post/${post.id}`}
      className={`group relative flex shrink-0 flex-col justify-end overflow-hidden rounded-2xl shadow-lg ${
        isHero ? "h-52 w-full" : "h-[150px] w-[220px]"
      }`}
    >
      <AbstractArtwork
        preset={post.abstractVisual?.preset ?? "prism"}
        className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-105"
        dim
      />
      <span className="absolute left-3 top-3 rounded-full bg-[rgba(255,190,46,0.92)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-on-accent)]">
        Destacado
      </span>
      <div className="relative flex flex-col gap-1.5 p-4">
        {!!post.title && (
          <h3 className={`font-display font-bold text-white ${isHero ? "line-clamp-3 text-xl" : "line-clamp-2 text-base"}`}>
            {post.title}
          </h3>
        )}
        {author && (
          <div className="flex items-center gap-1.5">
            <Avatar name={author.displayName} avatarUri={author.avatarUri} gradient={author.avatarGradient} size={24} />
            <span className="text-xs text-white/90">{author.displayName}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
