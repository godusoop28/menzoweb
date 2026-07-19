"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { BackIcon, BookmarkIcon, HeartIcon, SendIcon } from "@/components/icons";
import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { findPost, findUser } from "@/lib/store/selectors";
import { relativeTime } from "@/lib/time";

export default function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useAppState();
  const [commentDraft, setCommentDraft] = useState("");

  const post = findPost(state.social, id);
  const comments = state.social.comments
    .filter((c) => c.postId === id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  useEffect(() => {
    if (!id) return;
    actions.addRecentlyViewed({ kind: "post", id, at: new Date().toISOString() });
    actions.ensurePostLoaded(id);
    actions.loadPostComments(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!post) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">Esta publicación ya no está disponible.</p>
        <button onClick={() => router.back()} className="text-sm text-[var(--color-cyan)] cursor-pointer">
          Volver
        </button>
      </div>
    );
  }

  const author = findUser(state.social, post.authorId);
  const liked = post.likes.includes(LOCAL_USER_ID);
  const saved = post.bookmarkedBy.includes(LOCAL_USER_ID);
  const totalVotes = post.pollOptions?.reduce((sum, o) => sum + o.votes.length, 0) ?? 0;

  function submitComment() {
    const trimmed = commentDraft.trim();
    if (!trimmed || !post) return;
    actions.addComment(post.id, trimmed);
    setCommentDraft("");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer" aria-label="Volver">
        <BackIcon size={20} />
        Volver
      </button>

      {author && (
        <Link href={`/member/${author.id}`} className="flex items-center gap-3">
          <Avatar name={author.displayName} avatarUri={author.avatarUri} gradient={author.avatarGradient} size={48} showOnline online={author.isOnline} />
          <div>
            <p className="font-medium">{author.displayName}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Nivel {author.level} · {relativeTime(post.createdAt)}
            </p>
          </div>
        </Link>
      )}

      {!!post.title && <h1 className="font-display text-2xl font-bold">{post.title}</h1>}
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-[var(--color-text-secondary)]">{post.body}</p>

      {!!post.imageUri && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUri} alt="" className="w-full rounded-2xl object-cover" />
      )}

      {post.pollOptions && (
        <div className="flex flex-col gap-2">
          {post.pollOptions.map((option) => {
            const votes = option.votes.length;
            const pct = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
            const votedForThis = option.votes.includes(LOCAL_USER_ID);
            return (
              <button
                key={option.id}
                onClick={() => actions.votePoll(post.id, option.id)}
                className={`relative overflow-hidden rounded-xl border bg-[var(--color-surface-secondary)] p-3 text-left cursor-pointer ${
                  votedForThis ? "border-[var(--color-orange)]" : "border-[var(--color-border-soft)]"
                }`}
              >
                <span className="absolute inset-y-0 left-0 bg-[var(--color-orange)]/20" style={{ width: `${pct}%` }} />
                <span className="relative flex items-center justify-between">
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-sm text-[var(--color-text-secondary)]">{pct}%</span>
                </span>
              </button>
            );
          })}
          <p className="text-xs text-[var(--color-text-muted)]">{totalVotes} votos</p>
        </div>
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

      <div className="flex items-center gap-6 border-t border-[var(--color-border-soft)] pt-4">
        <button onClick={() => actions.toggleLike(post.id)} className="flex items-center gap-2 cursor-pointer" aria-label="Me gusta">
          <HeartIcon size={22} filled={liked} className={liked ? "text-[var(--color-coral)]" : "text-[var(--color-text-muted)]"} />
          <span className="text-sm text-[var(--color-text-secondary)]">{post.likes.length}</span>
        </button>
        <button onClick={() => actions.toggleBookmark(post.id)} className="flex items-center gap-2 cursor-pointer" aria-label="Guardar">
          <BookmarkIcon size={20} filled={saved} className={saved ? "text-[var(--color-yellow)]" : "text-[var(--color-text-muted)]"} />
          <span className="text-sm text-[var(--color-text-secondary)]">{saved ? "Guardado" : "Guardar"}</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">Comentarios</h2>
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Sé el primero en comentar.</p>
        ) : (
          comments.map((comment) => {
            const commentAuthor = findUser(state.social, comment.authorId);
            if (!commentAuthor) return null;
            return (
              <div key={comment.id} className="flex gap-2.5">
                <Link href={`/member/${commentAuthor.id}`}>
                  <Avatar name={commentAuthor.displayName} avatarUri={commentAuthor.avatarUri} gradient={commentAuthor.avatarGradient} size={34} />
                </Link>
                <div className="flex-1 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3">
                  <Link href={`/member/${commentAuthor.id}`} className="text-sm font-semibold">
                    {commentAuthor.displayName}
                  </Link>
                  <p className="text-sm text-[var(--color-text-secondary)]">{comment.body}</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">{relativeTime(comment.createdAt)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="sticky bottom-0 flex items-center gap-2 border-t border-[var(--color-border-soft)] bg-[var(--color-background)] py-3">
        <input
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitComment()}
          placeholder="Escribe algo…"
          className="flex-1 rounded-full bg-[var(--color-surface-secondary)] px-4 py-2.5 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
        />
        <button
          onClick={submitComment}
          disabled={!commentDraft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-orange)] text-[var(--color-text-on-accent)] disabled:opacity-50 cursor-pointer"
          aria-label="Enviar comentario"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
