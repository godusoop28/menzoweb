"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/Avatar";
import { GAME_DISPLAY_NAME } from "@/components/games/gameShared";
import { ApiError, gamesApi } from "@/lib/api";
import { mapUserSummary } from "@/lib/api/mappers";
import { useToast } from "@/lib/ToastContext";
import type { MatchResponseDto } from "@/lib/api/types";

/** Pantalla final (FINISHED/CANCELLED/ABANDONED/ERROR) — "Revancha" crea una partida NUEVA
 * (joinMode SELECTED, invita a los mismos jugadores — ver GameRoomMatchService.rematch en
 * menzoapi) y navega ahí directo; nunca reinicia el match actual in-place. Los demás jugadores
 * ven la propuesta como una tarjeta de invitación normal en el chat (con "Unirse" restringido a
 * ellos), no hay un flujo especial de "aceptar revancha" separado. */
export function ResultsScreen({ match }: { match: MatchResponseDto }) {
  const router = useRouter();
  const showToast = useToast();
  const [rematching, setRematching] = useState(false);

  const winner = match.winnerId ? match.players.find((p) => p.user.id === match.winnerId) : undefined;
  const canRematch = match.status === "FINISHED" && match.roomId != null;

  async function handleRematch() {
    setRematching(true);
    try {
      const next = await gamesApi.rematch(match.id);
      router.push(`/games/${next.id}`);
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No se pudo proponer la revancha.");
    } finally {
      setRematching(false);
    }
  }

  const title =
    match.status === "FINISHED"
      ? winner
        ? `Ganó ${winner.user.displayName}`
        : "Empate"
      : match.status === "CANCELLED"
        ? "Partida cancelada"
        : match.status === "ABANDONED"
          ? "Partida abandonada"
          : "Error en la partida";

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4 text-center">
      {winner && (
        <Avatar
          name={mapUserSummary(winner.user, null).displayName}
          avatarUri={winner.user.avatarUri ?? undefined}
          gradient={mapUserSummary(winner.user, null).avatarGradient}
          size={72}
        />
      )}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold">{title}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{GAME_DISPLAY_NAME[match.gameType]}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {canRematch && (
          <button
            onClick={handleRematch}
            disabled={rematching}
            className="w-full rounded-full bg-[var(--color-coral)] py-2.5 text-sm font-bold text-white disabled:opacity-50 cursor-pointer"
          >
            {rematching ? "Proponiendo…" : "Revancha"}
          </button>
        )}
        <button
          onClick={() => (match.roomId ? router.push(`/chat/${match.roomId}`) : router.push("/chat"))}
          className="w-full rounded-full bg-[var(--color-surface-secondary)] py-2.5 text-sm font-semibold cursor-pointer"
        >
          Volver al chat
        </button>
      </div>
    </div>
  );
}
