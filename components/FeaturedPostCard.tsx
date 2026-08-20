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
  // Foto real (imageUri legacy o primer bloque image/gif) si la hay — antes esta tarjeta ignoraba
  // la portada real del post y siempre mostraba arte procedural, aunque el autor hubiera subido
  // una imagen de verdad (mismo criterio que PostCard.tsx: nunca reemplazar contenido real del
  // usuario por un decorado genérico cuando existe).
  const coverImage = post.imageUri ?? post.blocks.find((b) => b.type === "image" || b.type === "gif")?.url;

  return (
    <Link
      href={`/post/${post.id}`}
      className={`group relative flex w-full flex-col justify-end overflow-hidden rounded-2xl shadow-lg ${
        isHero ? "h-52" : "h-[150px]"
      }`}
    >
      {coverImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <AbstractArtwork
          preset={post.abstractVisual?.preset ?? "prism"}
          className="absolute inset-0 h-full w-full transition-transform duration-300 group-hover:scale-105"
          dim
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
      <span className="absolute left-3 top-3 rounded-full bg-[rgba(255,190,46,0.92)] px-2.5 py-1 text-xs font-bold text-[var(--color-text-on-accent)]">
        {post.type === "blog" ? "Blog destacado" : "Destacado"}
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
