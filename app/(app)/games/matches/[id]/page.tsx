"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Avatar } from "@/components/Avatar";
import { BackIcon } from "@/components/icons";
import { ApiError, gamesApi, getMyRealId } from "@/lib/api";
import { toGradient } from "@/lib/api/mappers";
import { useGameMatchSocket } from "@/lib/realtime/useGameMatchSocket";
import { useToast } from "@/lib/ToastContext";
import type { MatchResponseDto, TicTacToeActionDto, TicTacToeStateDto } from "@/lib/api/types";

/** Tic-Tac-Toe — primer juego de "Menzo Games", sin información oculta: el mismo estado que
 * devuelve el backend es exactamente lo que ve cada jugador, así que esta pantalla se suscribe al
 * tópico público (`/topic/matches/{id}/state`), no a uno privado por jugador. Los próximos juegos
 * con información oculta van a necesitar su propia pantalla (esta no generaliza el tablero, solo
 * la conexión STOMP vía useGameMatchSocket). */
export default function TicTacToeMatchPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const showToast = useToast();
  const myId = getMyRealId();

  const [match, setMatch] = useState<MatchResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [forfeiting, setForfeiting] = useState(false);

  useEffect(() => {
    if (!id) return;
    gamesApi
      .getMatch(id)
      .then(setMatch)
      .catch((error) => {
        console.warn("[menzo/web] getMatch failed", error);
        showToast(error instanceof ApiError ? error.message : "No pudimos cargar la partida.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onEvent = useCallback((event: { matchId: string; payload: MatchResponseDto }) => {
    if (event.matchId !== id) return;
    setMatch((prev) => (!prev || event.payload.version >= prev.version ? event.payload : prev));
  }, [id]);
  useGameMatchSocket(id ? `/topic/matches/${id}/state` : undefined, onEvent);

  async function play(cell: number) {
    if (!match || acting) return;
    setActing(true);
    try {
      const action: TicTacToeActionDto = { cell };
      const updated = await gamesApi.act(match.id, { action, expectedVersion: match.version });
      setMatch(updated);
    } catch (error) {
      console.warn("[menzo/web] game action failed", error);
      showToast(error instanceof ApiError ? error.message : "No se pudo jugar esa casilla.");
    } finally {
      setActing(false);
    }
  }

  async function handleForfeit() {
    if (!match || forfeiting) return;
    setForfeiting(true);
    try {
      await gamesApi.forfeit(match.id);
      router.back();
    } catch (error) {
      console.warn("[menzo/web] forfeit failed", error);
      showToast(error instanceof ApiError ? error.message : "No se pudo abandonar la partida.");
    } finally {
      setForfeiting(false);
    }
  }

  if (loading) {
    return <p className="mx-auto w-full max-w-md px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">Cargando…</p>;
  }
  if (!match) {
    return <p className="mx-auto w-full max-w-md px-4 py-10 text-center text-sm text-[var(--color-text-muted)]">No encontramos esta partida.</p>;
  }

  const state = match.state as TicTacToeStateDto;
  const players = [...match.players].sort((a, b) => a.playerIndex - b.playerIndex);
  const me = players.find((p) => p.user.id === myId);
  const opponent = players.find((p) => p.user.id !== myId);
  const myMark = me?.playerIndex === 0 ? "X" : "O";
  const isMyTurn = match.status === "IN_PROGRESS" && state.players[state.currentPlayerIndex] === myId;

  let statusText: string;
  if (match.status === "FINISHED") {
    if (!match.winnerId) statusText = "Empate";
    else statusText = match.winnerId === myId ? "¡Ganaste!" : `Ganó ${opponent?.user.displayName ?? "tu rival"}`;
  } else if (match.status === "ABANDONED") {
    statusText = match.winnerId === myId ? `${opponent?.user.displayName ?? "Tu rival"} abandonó — ganaste` : "Abandonaste la partida";
  } else {
    statusText = isMyTurn ? "Tu turno" : `Turno de ${opponent?.user.displayName ?? "tu rival"}`;
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[var(--color-text-secondary)]">
          <BackIcon />
        </button>
        <h1 className="font-display text-xl font-bold">Tic-Tac-Toe</h1>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
        <PlayerBadge label={me?.user.displayName ?? "Vos"} avatarUri={me?.user.avatarUri} gradient={me?.user.avatarGradient} mark={myMark} highlight={isMyTurn} />
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">VS</span>
        <PlayerBadge
          label={opponent?.user.displayName ?? "Rival"}
          avatarUri={opponent?.user.avatarUri}
          gradient={opponent?.user.avatarGradient}
          mark={myMark === "X" ? "O" : "X"}
          highlight={!isMyTurn && match.status === "IN_PROGRESS"}
        />
      </div>

      <p className="text-center text-sm font-semibold text-[var(--color-text-secondary)]">{statusText}</p>

      <div className="mx-auto grid grid-cols-3 gap-2">
        {state.board.map((cell, index) => (
          <button
            key={index}
            onClick={() => play(index)}
            disabled={!isMyTurn || !!cell || acting}
            className="flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] font-display text-4xl font-bold disabled:cursor-not-allowed"
          >
            {cell}
          </button>
        ))}
      </div>

      {match.status === "IN_PROGRESS" && (
        <button
          onClick={handleForfeit}
          disabled={forfeiting}
          className="mt-2 self-center rounded-full bg-[var(--color-surface-secondary)] px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] disabled:opacity-60"
        >
          Abandonar partida
        </button>
      )}
    </div>
  );
}

function PlayerBadge({
  label,
  avatarUri,
  gradient,
  mark,
  highlight,
}: {
  label: string;
  avatarUri?: string | null;
  gradient?: string | null;
  mark: string;
  highlight: boolean;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${highlight ? "opacity-100" : "opacity-60"}`}>
      <Avatar name={label} avatarUri={avatarUri ?? undefined} gradient={toGradient(gradient)} size={44} />
      <span className="max-w-[80px] truncate text-xs font-medium">{label}</span>
      <span className="text-xs font-bold text-[var(--color-coral)]">{mark}</span>
    </div>
  );
}
