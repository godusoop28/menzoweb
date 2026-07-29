"use client";

import { useState } from "react";

import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { useToast } from "@/lib/ToastContext";
import type { Post } from "@/lib/types";

import { CheckIcon } from "./icons";

/** Antes de votar no se muestran barras ni porcentajes (no hay "resultados falsos" que mostrar
 * todavía); apenas el servidor confirma el voto, esta misma tarjeta cambia a la vista de
 * resultados con los conteos reales — nunca inventa ni interpola nada localmente. */
export function PollCard({ post }: { post: Post }) {
  const { actions } = useAppState();
  const accent = useAccent();
  const showToast = useToast();
  const [votingOptionId, setVotingOptionId] = useState<string | null>(null);

  const options = post.pollOptions ?? [];
  if (options.length === 0) return null;

  const totalVotes = options.reduce((sum, o) => sum + o.votes.length, 0);
  const myOption = options.find((o) => o.votes.includes(LOCAL_USER_ID));
  const hasVoted = !!myOption;

  async function handleVote(optionId: string) {
    if (votingOptionId) return;
    if (myOption?.id === optionId) return;
    setVotingOptionId(optionId);
    try {
      await actions.votePoll(post.id, optionId);
    } catch (error) {
      console.warn("[menzo/web] votePoll failed", error);
      showToast("No pudimos registrar tu voto. Inténtalo de nuevo.");
    } finally {
      setVotingOptionId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => {
        const votes = option.votes.length;
        const pct = totalVotes === 0 ? 0 : Math.round((votes / totalVotes) * 100);
        const isMine = option.id === myOption?.id;
        const isVoting = votingOptionId === option.id;
        return (
          <button
            key={option.id}
            onClick={(e) => {
              e.preventDefault();
              handleVote(option.id);
            }}
            disabled={!!votingOptionId}
            aria-pressed={isMine}
            className={`relative flex min-h-[44px] items-center overflow-hidden rounded-xl border px-3.5 py-2.5 text-left transition-colors cursor-pointer disabled:cursor-default ${
              isMine
                ? "border-[var(--color-orange)]"
                : "border-[var(--color-border-soft)] hover:border-[var(--color-border-strong)]"
            }`}
          >
            {hasVoted && (
              <span
                className="absolute inset-y-0 left-0 transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%`, background: isMine ? `${accent.color}30` : "var(--color-surface-soft)" }}
                aria-hidden
              />
            )}
            <span className="relative flex min-w-0 flex-1 items-center gap-2.5">
              {hasVoted ? (
                isMine && (
                  <span
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                    style={{ background: accent.color }}
                  >
                    <CheckIcon size={10} className="text-[var(--color-text-on-accent)]" />
                  </span>
                )
              ) : (
                <span
                  className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                    isMine ? "border-[var(--color-orange)]" : "border-[var(--color-text-muted)]"
                  }`}
                  aria-hidden
                />
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
                {option.label}
              </span>
              {isVoting ? (
                <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-[var(--color-text-muted)] border-t-transparent" />
              ) : (
                hasVoted && (
                  <span className="shrink-0 text-xs font-semibold text-[var(--color-text-secondary)]">{pct}%</span>
                )
              )}
            </span>
          </button>
        );
      })}
      <p className="text-xs text-[var(--color-text-muted)]">
        {totalVotes === 0 ? "Sé el primero en votar" : `${totalVotes} voto${totalVotes === 1 ? "" : "s"}`}
      </p>
    </div>
  );
}
