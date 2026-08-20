"use client";

import Link from "next/link";

import { useAppState } from "@/lib/AppStateContext";
import { relativeTime } from "@/lib/time";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { findUser } from "@/lib/store/selectors";
import { gradientCss } from "@/lib/theme";
import type { Post } from "@/lib/types";

import { AbstractArtwork } from "./AbstractArtwork";
import { Avatar } from "./Avatar";
import { BookmarkIcon, CommentIcon, HeartIcon } from "./icons";
import { PollCard } from "./PollCard";
import { PostMenuButton } from "./post/PostMenuButton";

const typeLabel: Record<Post["type"], string> = {
  text: "",
  image: "Imagen",
  poll: "Encuesta",
  question: "Pregunta",
  event: "Evento",
  blog: "Blog",
};

export function PostCard({ post }: { post: Post }) {
  const { state, actions } = useAppState();
  const author = findUser(state.social, post.authorId);
  const liked = post.likes.includes(LOCAL_USER_ID);
  const saved = post.bookmarkedBy.includes(LOCAL_USER_ID);

  if (!author) return null;

  // Preview compacto para la tarjeta del feed, no el post completo — `post.body` ya es un
  // excerpt de solo texto derivado server-side de `blocks` (ver PostService.deriveBodyFromBlocks),
  // así que sigue sirviendo tal cual acá. La portada usa la primera imagen/gif de los bloques si
  // no hay `imageUri` legacy — el resto de los bloques (más imágenes, separadores, etc.) solo se
  // ven al entrar al post (ver PostBlockRenderer en la página de detalle).
  const coverImage = post.imageUri ?? post.blocks.find((b) => b.type === "image" || b.type === "gif")?.url;

  // Acento de color por post (misma paleta que ya usa el avatar) — antes solo se usaba como una
  // barra plana de 6px; ahora es el panel de portada completo cuando no hay foto ni arte
  // procedural. Estilo "comunidad viva" (Amino): cada tarjeta tiene su propia personalidad de
  // color, no todas el mismo gris.
  const accent = post.gradient ? gradientCss(post.gradient) : undefined;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] menzo-fade-in shadow-[0_4px_18px_-6px_rgba(0,0,0,0.4)] transition-shadow hover:border-[var(--color-border-strong)] hover:shadow-[0_10px_32px_-8px_rgba(0,0,0,0.6)]">
      {/* Franja de portada estilo revista — foto real si hay, si no arte procedural, si no un
          panel de color plano (posts sin imagen y sin abstractVisual, p. ej. encuestas) — siempre
          algo visual, nunca la tarjeta vacía de arriba que tenía antes. */}
      <Link href={`/post/${post.id}`} className="relative block h-44 w-full shrink-0 overflow-hidden sm:h-52">
        {coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : post.abstractVisual ? (
          <AbstractArtwork preset={post.abstractVisual.preset} className="absolute inset-0 h-full w-full" />
        ) : (
          <div className="absolute inset-0" style={{ background: accent ?? "var(--color-surface-elevated)" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
          {!!typeLabel[post.type] && (
            <span className="mb-1 w-fit rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
              {typeLabel[post.type]}
            </span>
          )}
          {!!post.title && <h3 className="font-display text-lg font-bold text-white line-clamp-2">{post.title}</h3>}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <Link href={`/member/${author.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar
              name={author.displayName}
              avatarUri={author.avatarUri}
              gradient={author.avatarGradient}
              size={38}
              showOnline
              online={author.isOnline}
              level={author.level}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{author.displayName}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                Nivel {author.level} · {relativeTime(post.createdAt)}
              </p>
            </div>
          </Link>
          <PostMenuButton post={post} />
        </div>

        <Link href={`/post/${post.id}`}>
          <p className="line-clamp-3 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{post.body}</p>
        </Link>

        {post.type === "poll" && <PollCard post={post} />}

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs text-[var(--color-cyan)]">
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto flex items-center gap-5 pt-1">
          <button
            onClick={() => actions.toggleLike(post.id)}
            className="flex items-center gap-1.5 text-[var(--color-text-muted)] cursor-pointer"
            aria-label={liked ? "Quitar me gusta" : "Me gusta"}
          >
            <HeartIcon filled={liked} className={liked ? "text-[var(--color-coral)]" : ""} />
            <span className={`text-xs ${liked ? "text-[var(--color-coral)]" : ""}`}>{post.likes.length}</span>
          </button>

          <Link href={`/post/${post.id}`} className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
            <CommentIcon />
            <span className="text-xs">{post.commentCount}</span>
          </Link>

          <button
            onClick={() => actions.toggleBookmark(post.id)}
            className="text-[var(--color-text-muted)] cursor-pointer"
            aria-label={saved ? "Quitar de guardados" : "Guardar"}
          >
            <BookmarkIcon filled={saved} className={saved ? "text-[var(--color-yellow)]" : ""} />
          </button>
        </div>
      </div>
    </article>
  );
}
