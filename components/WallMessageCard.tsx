"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getMyRealId } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { useWallCommentsSocket } from "@/lib/realtime/useWallCommentsSocket";
import { relativeTime } from "@/lib/time";
import { findUser, wallCommentsForMessage } from "@/lib/store/selectors";
import type { WallComment, WallMessage } from "@/lib/types";

import { Avatar } from "./Avatar";
import { CloseIcon, HeartIcon, ImageIcon, SendIcon } from "./icons";

export function WallMessageCard({ message }: { message: WallMessage }) {
  const { state, actions } = useAppState();
  const author = findUser(state.social, message.authorId);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [replyTo, setReplyTo] = useState<WallComment | null>(null);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef(0);

  const comments = wallCommentsForMessage(state.social, message.id);
  const isWallOwner = message.profileId === getMyRealId();

  useWallCommentsSocket(expanded ? message.id : undefined);

  useEffect(() => {
    if (!expanded) return;
    pageRef.current = 0;
    actions.loadWallComments(message.id, 0).then((result) => setHasMore(!!result?.hasNext));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, message.id]);

  if (!author) return null;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUri(URL.createObjectURL(file));
    setImageFile(file);
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const result = await actions.loadWallComments(message.id, nextPage);
      pageRef.current = nextPage;
      setHasMore(!!result?.hasNext);
    } finally {
      setLoadingMore(false);
    }
  }

  async function submitComment() {
    const trimmed = draft.trim();
    if (!trimmed && !imageUri) return;
    setSending(true);
    try {
      await actions.addWallComment(message.id, trimmed, {
        imageUri,
        imageFile,
        parentCommentId: replyTo?.id,
      });
      setDraft("");
      setImageUri(undefined);
      setImageFile(undefined);
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  }

  function parentAuthorName(comment: WallComment): string | null {
    if (!comment.parentCommentId) return null;
    const parent = comments.find((c) => c.id === comment.parentCommentId);
    if (!parent) return null;
    return findUser(state.social, parent.authorId)?.displayName ?? null;
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
        {message.body && <p className="text-sm text-[var(--color-text-secondary)]">{message.body}</p>}
        {message.imageUri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.imageUri} alt="" className="mt-2 max-h-72 w-full rounded-xl object-cover" />
        )}
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
            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="self-center text-xs font-medium text-[var(--color-cyan)] cursor-pointer disabled:opacity-50"
              >
                {loadingMore ? "Cargando…" : "Cargar comentarios anteriores"}
              </button>
            )}

            {comments.map((comment) => {
              const commentAuthor = findUser(state.social, comment.authorId);
              if (!commentAuthor) return null;
              const isMine = comment.authorId === LOCAL_USER_ID;
              const canDelete = isMine || isWallOwner;
              const replyingToName = parentAuthorName(comment);
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
                    {replyingToName && (
                      <p className="text-[10px] font-medium text-[var(--color-text-muted)]">
                        Respondiendo a @{replyingToName}
                      </p>
                    )}
                    <Link href={`/member/${commentAuthor.id}`} className="text-xs font-semibold">
                      {commentAuthor.displayName}
                    </Link>
                    {comment.body && <p className="text-sm text-[var(--color-text-secondary)]">{comment.body}</p>}
                    {comment.imageUri && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={comment.imageUri} alt="" className="mt-1 max-h-48 w-full rounded-lg object-cover" />
                    )}
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
                      <button
                        onClick={() => setReplyTo(comment)}
                        className="text-xs font-medium text-[var(--color-text-muted)] cursor-pointer"
                      >
                        Responder
                      </button>
                      {canDelete && (
                        <button
                          onClick={() => actions.deleteWallComment(comment.id, message.id)}
                          className="text-xs font-medium text-[var(--color-coral)] cursor-pointer"
                        >
                          Borrar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {replyTo && (
              <div className="flex items-center justify-between rounded-lg bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs text-[var(--color-text-muted)]">
                Respondiendo a @{findUser(state.social, replyTo.authorId)?.displayName ?? "…"}
                <button onClick={() => setReplyTo(null)} className="cursor-pointer" aria-label="Cancelar respuesta">
                  <CloseIcon size={14} />
                </button>
              </div>
            )}

            {imageUri && (
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUri} alt="" className="h-14 w-14 rounded-lg object-cover" />
                <button
                  onClick={() => {
                    setImageUri(undefined);
                    setImageFile(undefined);
                  }}
                  className="text-xs font-medium text-[var(--color-coral)] cursor-pointer"
                >
                  Quitar imagen
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] cursor-pointer"
                aria-label="Adjuntar imagen"
              >
                <ImageIcon size={16} />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitComment()}
                placeholder={replyTo ? "Escribe tu respuesta…" : "Escribe un comentario…"}
                className="flex-1 rounded-full border border-transparent bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs outline-none transition-colors focus:border-[var(--color-orange)] placeholder:text-[var(--color-text-muted)]"
              />
              <button
                onClick={submitComment}
                disabled={(!draft.trim() && !imageUri) || sending}
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
