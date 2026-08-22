"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GameIcon } from "@/components/icons";
import { GAME_DISPLAY_NAME, PlayerAvatarsRow, hasHiddenStateFor, isActiveStatus, isLobbyStatus, statusLabel } from "@/components/games/gameShared";
import { ApiError, gamesApi, getMyRealId } from "@/lib/api";
import { useGameMatchSocket } from "@/lib/realtime/useGameMatchSocket";
import { useToast } from "@/lib/ToastContext";
import type { MatchResponseDto } from "@/lib/api/types";

/** Tarjeta de invitación embebida en el chat (message.type === "game_invite") — NO carga el
 * estado de la partida completo, solo lo necesario para decidir el botón (unirse/entrar/llena/
 * finalizada). El tablero real vive en /games/[matchId]. Se actualiza sola en tiempo real
 * suscribiéndose a /topic/matches/{matchId}/state (useGameMatchSocket) — sin esto la tarjeta
 * quedaría congelada en "Esperando jugadores" para siempre aunque la partida ya haya arrancado. */
export function GameInviteCard({ matchId }: { matchId: string }) {
  const router = useRouter();
  const showToast = useToast();
  const myId = getMyRealId();
  const [match, setMatch] = useState<MatchResponseDto | null>(null);
  const [error, setError] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    gamesApi
      .getMatch(matchId)
      .then(setMatch)
      .catch(() => setError(true));
  }, [matchId]);

  // Antes de que resuelva el primer fetch no sabemos el gameType — false por defecto no rompe
  // nada mientras tanto (los eventos de lobby, WAITING/READY/CANCELLED, siempre van al tópico
  // público sin importar el juego; solo MATCH_STARTED en adelante depende de esto, y para
  // entonces `match` ya está seteado). Se resuscribe solo si el gameType resulta ser de
  // información oculta (ver hasHiddenStateFor).
  useGameMatchSocket(matchId, match ? hasHiddenStateFor(match.gameType) : false, {
    onEvent: (event) => setMatch(event.payload),
    onReconnected: () => gamesApi.getMatch(matchId).then(setMatch).catch(() => setError(true)),
  });

  if (error) {
    return (
      <div className="w-full max-w-[280px] rounded-2xl bg-[var(--color-surface-secondary)] p-3 text-sm text-[var(--color-text-muted)]">
        No pudimos cargar esta partida.
      </div>
    );
  }
  if (!match) {
    return (
      <div className="w-full max-w-[280px] rounded-2xl bg-[var(--color-surface-secondary)] p-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-cyan)]" />
      </div>
    );
  }

  const iJoined = myId != null && match.players.some((p) => p.user.id === myId);
  const isFull = match.maxPlayers != null && match.players.length >= match.maxPlayers;
  const winner = match.winnerId ? match.players.find((p) => p.user.id === match.winnerId) : undefined;

  let buttonLabel = "";
  let buttonDisabled = false;
  let onClick: () => void = () => router.push(`/games/${matchId}`);

  if (isLobbyStatus(match.status)) {
    if (iJoined) {
      buttonLabel = "Entrar a partida";
    } else if (isFull) {
      buttonLabel = "Partida llena";
      buttonDisabled = true;
    } else {
      buttonLabel = "Unirse";
      onClick = async () => {
        setJoining(true);
        try {
          await gamesApi.join(matchId);
          router.push(`/games/${matchId}`);
        } catch (err) {
          showToast(err instanceof ApiError ? err.message : "No se pudo unir a la partida.");
        } finally {
          setJoining(false);
        }
      };
    }
  } else if (isActiveStatus(match.status)) {
    buttonLabel = "Partida en curso · Ver partida";
  } else if (match.status === "FINISHED") {
    buttonLabel = "Ver resultados";
  } else if (match.status === "CANCELLED") {
    buttonLabel = "Partida cancelada";
    buttonDisabled = true;
  } else if (match.status === "ABANDONED") {
    buttonLabel = "Partida abandonada";
    buttonDisabled = true;
  } else {
    buttonLabel = statusLabel(match.status);
    buttonDisabled = true;
  }

  return (
    <div className="w-full max-w-[280px] overflow-hidden rounded-2xl bg-[var(--color-surface-secondary)]">
      <div className="flex items-center gap-2 px-3.5 pt-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-cyan)]">
          <GameIcon size={18} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{GAME_DISPLAY_NAME[match.gameType]}</p>
          <p className="truncate text-xs text-[var(--color-text-muted)]">
            {match.status === "FINISHED" && winner
              ? `Ganó ${winner.user.displayName}`
              : `${statusLabel(match.status)} · ${match.players.length}${match.maxPlayers != null ? `/${match.maxPlayers}` : ""}`}
          </p>
        </div>
      </div>
      <div className="px-3.5 py-2.5">
        <PlayerAvatarsRow players={match.players} size={26} />
      </div>
      <button
        onClick={onClick}
        disabled={buttonDisabled || joining}
        className="w-full border-t border-[var(--color-border-soft)] py-2.5 text-sm font-semibold text-[var(--color-cyan)] transition-colors cursor-pointer disabled:cursor-default disabled:text-[var(--color-text-muted)] hover:bg-[var(--color-surface-soft)] disabled:hover:bg-transparent"
      >
        {joining ? "Uniéndose…" : buttonLabel}
      </button>
    </div>
  );
}
