"use client";

import Link from "next/link";

import { useAppState } from "@/lib/AppStateContext";
import { relativeTime } from "@/lib/time";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { findUser } from "@/lib/store/selectors";
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

// Rol GLOBAL de la cuenta (USER/CURATOR/LEADER/MASTER) — no el rol dentro de una comunidad
// puntual (CommunityMemberDto.communityRole, que el feed no trae sin un fetch extra por autor).
// Mismo criterio de "no inventar datos" que el resto del pedido: se muestra solo lo que el store
// ya tiene, nunca un placeholder tipo "MOD" que no venga de la API.
const ROLE_LABEL: Record<string, string> = { CURATOR: "Curador", LEADER: "Líder", MASTER: "Staff" };

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
  const roleLabel = ROLE_LABEL[author.globalRole];

  return (
    <article className="group relative flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 menzo-fade-in shadow-[0_4px_18px_-6px_rgba(0,0,0,0.4)] transition-colors hover:border-[var(--color-border-strong)]">
      {post.featured && (
        <span className="absolute -top-2.5 left-4 w-fit rounded-full bg-[var(--color-yellow)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-text-on-accent)] shadow-sm">
          {post.type === "blog" ? "Blog destacado" : "Destacado"}
        </span>
      )}

      <div className="flex items-center gap-3">
        <Link href={`/member/${author.id}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar
            name={author.displayName}
            avatarUri={author.avatarUri}
            gradient={author.avatarGradient}
            size={40}
            showOnline
            online={author.isOnline}
            level={author.level}
          />
          <div className="min-w-0">
            <p className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{author.displayName}</span>
              {roleLabel && (
                <span className="shrink-0 rounded-full bg-[var(--color-purple)]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-violet)]">
                  {roleLabel}
                </span>
              )}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">{relativeTime(post.createdAt)}</p>
          </div>
        </Link>
        <PostMenuButton post={post} />
      </div>

      {!!post.title && (
        <Link href={`/post/${post.id}`} className="font-display text-base font-bold text-[var(--color-text-primary)]">
          {post.title}
        </Link>
      )}

      <Link href={`/post/${post.id}`}>
        <p className="line-clamp-4 whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{post.body}</p>
      </Link>

      {post.type === "poll" && <PollCard post={post} />}

      {(coverImage || post.abstractVisual) && (
        <Link href={`/post/${post.id}`} className="relative block h-56 w-full shrink-0 overflow-hidden rounded-xl sm:h-72">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImage}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <AbstractArtwork preset={post.abstractVisual!.preset} className="absolute inset-0 h-full w-full" />
          )}
          {!!typeLabel[post.type] && post.type !== "blog" && (
            <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
              {typeLabel[post.type]}
            </span>
          )}
        </Link>
      )}

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs text-[var(--color-cyan)]">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center gap-5 border-t border-[var(--color-border-soft)] pt-3">
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
          className="ml-auto text-[var(--color-text-muted)] cursor-pointer"
          aria-label={saved ? "Quitar de guardados" : "Guardar"}
        >
          <BookmarkIcon filled={saved} className={saved ? "text-[var(--color-yellow)]" : ""} />
        </button>
      </div>
    </article>
  );
}
