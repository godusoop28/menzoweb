"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { BackIcon } from "@/components/icons";
import { GameLobby } from "@/components/games/GameLobby";
import { ResultsScreen } from "@/components/games/ResultsScreen";
import { LudoBoard } from "@/components/games/ludo/LudoBoard";
import { MenzoCardsBoard } from "@/components/games/cards/MenzoCardsBoard";
import { hasHiddenStateFor, isActiveStatus, isLobbyStatus } from "@/components/games/gameShared";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError, gamesApi, getMyRealId } from "@/lib/api";
import { useGameMatchSocket } from "@/lib/realtime/useGameMatchSocket";
import { useToast } from "@/lib/ToastContext";
import type { MatchResponseDto } from "@/lib/api/types";

const HEARTBEAT_INTERVAL_MS = 15_000;

/** Contenedor único de toda partida (lobby → tablero → resultados) — mismo criterio de ruta que
 * communities/[slug]/whiteboard/page.tsx: se resuelve por id de la URL, no por "algo activo" del
 * contexto global, así que volver acá desde el chat (tarjeta "Partida en curso · Ver partida")
 * siempre reconecta al estado real del servidor en vez de reusar cualquier cosa que hubiera en
 * memoria. El heartbeat (15s, mismo intervalo que LiveRoomContext) es lo único que mantiene esta
 * pestaña "conectada" a ojos del servidor — sin esto, GamePresenceScheduler la marcaría
 * desconectada aunque el socket siga vivo. */
export default function GameMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const router = useRouter();
  const showToast = useToast();
  const myId = getMyRealId();
  const [match, setMatch] = useState<MatchResponseDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [abandoning, setAbandoning] = useState(false);

  function reload() {
    gamesApi
      .getMatch(matchId)
      .then(setMatch)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No pudimos cargar la partida."));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  // Igual criterio que GameInviteCard: antes del primer fetch no sabemos el gameType, false por
  // defecto no rompe nada (todo lo de lobby va al tópico público sin importar el juego) — en
  // cuanto `match` se setea, si el juego tiene información oculta (MENZO_CARDS) el hook se
  // resuscribe solo al tópico privado, indispensable para recibir MATCH_STARTED/actualizaciones
  // de estado en un juego con mano oculta.
  useGameMatchSocket(matchId, match ? hasHiddenStateFor(match.gameType) : false, {
    onEvent: (event) => setMatch(event.payload),
    onReconnected: reload,
  });

  useEffect(() => {
    if (!match || match.status === "FINISHED" || match.status === "CANCELLED" || match.status === "ABANDONED" || match.status === "ERROR") return;
    const interval = setInterval(() => {
      gamesApi.heartbeat(matchId).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [match, matchId]);

  async function handleStart() {
    try {
      await gamesApi.start(matchId);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No se pudo iniciar la partida.");
    }
  }

  async function handleCancel() {
    try {
      await gamesApi.cancel(matchId);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No se pudo cancelar la partida.");
    }
  }

  async function handleLeaveLobby() {
    try {
      await gamesApi.leave(matchId);
      router.push(match?.roomId ? `/chat/${match.roomId}` : "/chat");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No se pudo salir de la sala.");
    }
  }

  async function handleAbandon() {
    setAbandoning(true);
    try {
      await gamesApi.leave(matchId);
      router.push(match?.roomId ? `/chat/${match.roomId}` : "/chat");
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No se pudo abandonar la partida.");
    } finally {
      setAbandoning(false);
      setConfirmAbandon(false);
    }
  }

  if (error) {
    return (
      <div className="flex h-[calc(100dvh-64px)] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm text-[var(--color-coral)]">{error}</p>
        <button onClick={() => router.push("/chat")} className="rounded-full bg-[var(--color-surface-secondary)] px-4 py-2 text-sm font-semibold cursor-pointer">
          Volver al chat
        </button>
      </div>
    );
  }
  if (!match) {
    return (
      <div className="flex h-[calc(100dvh-64px)] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-cyan)]" />
      </div>
    );
  }

  const active = isActiveStatus(match.status);

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px)] w-full max-w-3xl flex-col">
      {active && (
        <div className="flex shrink-0 items-center justify-between px-4 pt-3">
          <button
            onClick={() => router.push(match.roomId ? `/chat/${match.roomId}` : "/chat")}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-secondary)] cursor-pointer hover:bg-[var(--color-surface-secondary)]"
            aria-label="Volver al chat"
            title="Volver al chat (la partida sigue en curso)"
          >
            <BackIcon size={18} />
          </button>
          <button
            onClick={() => setConfirmAbandon(true)}
            className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-coral)] cursor-pointer"
          >
            Abandonar partida
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLobbyStatus(match.status) && <GameLobby match={match} myId={myId} onStart={handleStart} onCancel={handleCancel} onLeave={handleLeaveLobby} />}
        {active &&
          (match.gameType === "LUDO" ? (
            <LudoBoard match={match} myId={myId} />
          ) : match.gameType === "MENZO_CARDS" ? (
            <MenzoCardsBoard match={match} myId={myId} />
          ) : (
            <div className="flex h-full items-center justify-center px-4 text-center text-sm text-[var(--color-text-muted)]">
              Este juego todavía no tiene tablero — disponible pronto.
            </div>
          ))}
        {!isLobbyStatus(match.status) && !active && <ResultsScreen match={match} />}
      </div>

      <ConfirmDialog
        open={confirmAbandon}
        title="¿Abandonar la partida?"
        description="Los demás jugadores siguen la partida sin vos."
        confirmLabel="Abandonar"
        busy={abandoning}
        danger
        onConfirm={handleAbandon}
        onCancel={() => setConfirmAbandon(false)}
      />
    </div>
  );
}
