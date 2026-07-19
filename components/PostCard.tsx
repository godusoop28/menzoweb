"use client";

import Link from "next/link";

import { useAppState } from "@/lib/AppStateContext";
import { relativeTime } from "@/lib/time";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { findUser } from "@/lib/store/selectors";
import type { Post } from "@/lib/types";

import { Avatar } from "./Avatar";
import { BookmarkIcon, CommentIcon, HeartIcon } from "./icons";

const typeLabel: Record<Post["type"], string> = {
  text: "",
  image: "Imagen",
  poll: "Encuesta",
  question: "Pregunta",
  event: "Evento",
};

export function PostCard({ post }: { post: Post }) {
  const { state, actions } = useAppState();
  const author = findUser(state.social, post.authorId);
  const liked = post.likes.includes(LOCAL_USER_ID);
  const saved = post.bookmarkedBy.includes(LOCAL_USER_ID);

  if (!author) return null;

  return (
    <article className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 flex flex-col gap-3 menzo-fade-in">
      <div className="flex items-center justify-between gap-3">
        <Link href={`/member/${author.id}`} className="flex items-center gap-3 min-w-0">
          <Avatar
            name={author.displayName}
            avatarUri={author.avatarUri}
            gradient={author.avatarGradient}
            size={42}
            showOnline
            online={author.isOnline}
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">{author.displayName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Nivel {author.level} · {relativeTime(post.createdAt)}
            </p>
          </div>
        </Link>
        {!!typeLabel[post.type] && (
          <span className="shrink-0 rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)]">
            {typeLabel[post.type]}
          </span>
        )}
      </div>

      <Link href={`/post/${post.id}`} className="flex flex-col gap-3">
        {!!post.title && <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{post.title}</h3>}
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{post.body}</p>
        {!!post.imageUri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.imageUri} alt="" className="max-h-96 w-full rounded-xl object-cover" />
        )}
      </Link>

      {post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs text-[var(--color-cyan)]">
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-5 pt-1">
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
    </article>
  );
}
