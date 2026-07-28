"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useAppState } from "@/lib/AppStateContext";
import { relativeTime } from "@/lib/time";
import { findUser, wallCommentsForMessage } from "@/lib/store/selectors";
import type { WallMessage } from "@/lib/types";

import { Avatar } from "./Avatar";
import { HeartIcon, SendIcon } from "./icons";

export function WallMessageCard({ message }: { message: WallMessage }) {
  const { state, actions } = useAppState();
  const author = findUser(state.social, message.authorId);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");

  const comments = wallCommentsForMessage(state.social, message.id);

  useEffect(() => {
    if (expanded) actions.loadWallComments(message.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, message.id]);

  if (!author) return null;

  function submitComment() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    actions.addWallComment(message.id, trimmed);
    setDraft("");
  }

  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.4)]">
      <Link href={`/member/${author.id}`}>
        <Avatar name={author.displayName} avatarUri={author.avatarUri} gradient={author.avatarGradient} size={34} level={author.level} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/member/${author.id}`} className="text-sm font-semibold">
          {author.displayName}
        </Link>
        <p className="text-sm text-[var(--color-text-secondary)]">{message.body}</p>
        <div className="mt-1 flex items-center gap-3">
          <p className="text-xs text-[var(--color-text-muted)]">{relativeTime(message.createdAt)}</p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs font-medium text-[var(--color-cyan)] cursor-pointer"
          >
            {message.commentCount > 0 ? `${message.commentCount} comentarios` : "Comentar"}
          </button>
        </div>

        {expanded && (
          <div className="mt-3 flex flex-col gap-3 border-t border-[var(--color-border-soft)] pt-3">
            {comments.map((comment) => {
              const commentAuthor = findUser(state.social, comment.authorId);
              if (!commentAuthor) return null;
              return (
                <div key={comment.id} className="flex gap-2">
                  <Link href={`/member/${commentAuthor.id}`}>
                    <Avatar
                      name={commentAuthor.displayName}
                      avatarUri={commentAuthor.avatarUri}
                      gradient={commentAuthor.avatarGradient}
                      size={26}
                    />
                  </Link>
                  <div className="min-w-0 flex-1 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2">
                    <Link href={`/member/${commentAuthor.id}`} className="text-xs font-semibold">
                      {commentAuthor.displayName}
                    </Link>
                    <p className="text-sm text-[var(--color-text-secondary)]">{comment.body}</p>
                    <div className="mt-1 flex items-center gap-3">
                      <p className="text-xs text-[var(--color-text-muted)]">{relativeTime(comment.createdAt)}</p>
                      <button
                        onClick={() => actions.toggleWallCommentLike(comment.id, message.id)}
                        className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] cursor-pointer"
                        aria-label="Me gusta"
                      >
                        <HeartIcon
                          size={13}
                          filled={comment.likedByMe}
                          className={comment.likedByMe ? "text-[var(--color-coral)]" : "text-[var(--color-text-muted)]"}
                        />
                        {comment.likeCount > 0 && comment.likeCount}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder="Escribe un comentario…"
                className="flex-1 rounded-full border border-transparent bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs outline-none transition-colors focus:border-[var(--color-orange)] placeholder:text-[var(--color-text-muted)]"
              />
              <button
                onClick={submitComment}
                disabled={!draft.trim()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-orange)] text-[var(--color-text-on-accent)] disabled:opacity-50 cursor-pointer"
                aria-label="Enviar comentario"
              >
                <SendIcon size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
