"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Avatar } from "@/components/Avatar";
import { GAME_DISPLAY_NAME } from "@/components/games/gameShared";
import { ApiError, gamesApi } from "@/lib/api";
import { mapUserSummary } from "@/lib/api/mappers";
import { getCachedSession } from "@/lib/api/session";
import { MC_GAME_WIN_REWARD, useWallet } from "@/lib/wallet/WalletContext";
import { MenzoCoin } from "@/components/wallet/MenzoCoin";
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
  const { rewardGameWin } = useWallet();
  const iWon = match.status === "FINISHED" && !!match.winnerId && match.winnerId === getCachedSession()?.userId;

  // Recompensa demo de MC por ganar — el wallet evita pagar dos veces la misma partida.
  useEffect(() => {
    if (iWon) rewardGameWin(match.id, GAME_DISPLAY_NAME[match.gameType]);
  }, [iWon, match.id, match.gameType, rewardGameWin]);

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

      {iWon && (
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-yellow)]/30 bg-[var(--color-yellow)]/10 px-4 py-2 font-display text-sm font-bold text-[var(--color-yellow)]">
          <MenzoCoin size={20} />+{MC_GAME_WIN_REWARD} MC por ganar
        </div>
      )}

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
