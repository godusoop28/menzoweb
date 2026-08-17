"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/Avatar";
import { ApiError, gamesApi, getMyRealId } from "@/lib/api";
import { toGradient } from "@/lib/api/mappers";
import { useToast } from "@/lib/ToastContext";
import type { MatchResponseDto } from "@/lib/api/types";

const GAME_LABEL: Record<string, string> = { TIC_TAC_TOE: "Tic-Tac-Toe" };

/** Entrada a "Menzo Games" — sin esta pantalla, un jugador desafiado (ver botón "Jugar" en
 * member/[id]) no tenía NINGUNA forma de enterarse: la partida se creaba y solo el que desafió
 * era llevado a jugar. Acá se listan todas las partidas del usuario (propias + donde lo
 * desafiaron), separando las que están esperando su turno. */
export default function GamesPage() {
  const router = useRouter();
  const showToast = useToast();
  const myId = getMyRealId();

  const [matches, setMatches] = useState<MatchResponseDto[] | null>(null);

  useEffect(() => {
    gamesApi
      .listMyMatches("IN_PROGRESS", 0, 50)
      .then((page) => setMatches(page.items))
      .catch((error) => {
        console.warn("[menzo/web] listMyMatches failed", error);
        showToast(error instanceof ApiError ? error.message : "No pudimos cargar tus partidas.");
        setMatches([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <h1 className="font-display text-xl font-bold">Mis partidas</h1>

      {matches === null && (
        <p className="text-center text-sm text-[var(--color-text-muted)]">Cargando…</p>
      )}

      {matches?.length === 0 && (
        <p className="text-center text-sm text-[var(--color-text-muted)]">
          No tenés partidas en curso. Desafiá a alguien desde su perfil.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {matches?.map((match) => {
          const opponent = match.players.find((p) => p.user.id !== myId);
          const me = match.players.find((p) => p.user.id === myId);
          const state = match.state as { players?: string[]; currentPlayerIndex?: number } | undefined;
          const isMyTurn =
            !!state?.players && typeof state.currentPlayerIndex === "number" && state.players[state.currentPlayerIndex] === myId;

          return (
            <button
              key={match.id}
              onClick={() => router.push(`/games/matches/${match.id}`)}
              className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              <Avatar
                name={opponent?.user.displayName ?? "Rival"}
                avatarUri={opponent?.user.avatarUri ?? undefined}
                gradient={toGradient(opponent?.user.avatarGradient)}
                size={44}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{opponent?.user.displayName ?? "Rival"}</p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  {GAME_LABEL[match.gameType] ?? match.gameType} · vos: {me?.playerIndex === 0 ? "X" : "O"}
                </p>
              </div>
              {isMyTurn && (
                <span className="shrink-0 rounded-full bg-[var(--color-coral)] px-2.5 py-1 text-[11px] font-bold text-white">
                  Tu turno
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
