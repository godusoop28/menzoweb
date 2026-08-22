"use client";

import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { GAME_DISPLAY_NAME, statusLabel } from "@/components/games/gameShared";
import { mapUserSummary } from "@/lib/api/mappers";
import type { MatchResponseDto } from "@/lib/api/types";

/** Lobby de una partida (WAITING/READY/STARTING) — lista de asientos con placeholders vacíos
 * hasta maxPlayers, controles de host (iniciar/cancelar) o de invitado (salir). El anfitrión es
 * `match.createdBy`, no necesariamente el jugador 0 — si el host se fue, GameRoomMatchService ya
 * transfirió el rol a otro jugador y este componente lo refleja solo (no hay lógica local). */
export function GameLobby({
  match,
  myId,
  onStart,
  onCancel,
  onLeave,
}: {
  match: MatchResponseDto;
  myId: string | null;
  onStart: () => Promise<void>;
  onCancel: () => Promise<void>;
  onLeave: () => Promise<void>;
}) {
  const [starting, setStarting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"cancel" | "leave" | null>(null);
  const [busy, setBusy] = useState(false);

  const isHost = myId != null && match.createdBy === myId;
  const canStart = isHost && match.minPlayers != null && match.players.length >= match.minPlayers && match.status !== "STARTING";
  const emptySeats = Math.max(0, (match.maxPlayers ?? match.players.length) - match.players.length);

  async function handleConfirm() {
    setBusy(true);
    try {
      if (confirmAction === "cancel") await onCancel();
      else if (confirmAction === "leave") await onLeave();
    } finally {
      setBusy(false);
      setConfirmAction(null);
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-display text-xl font-bold">{GAME_DISPLAY_NAME[match.gameType]}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">{statusLabel(match.status)}</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {match.players.map((p) => {
          const user = mapUserSummary(p.user, null);
          return (
            <div key={user.id} className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-secondary)] p-2.5">
              <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.displayName}</p>
                {!p.connected && <p className="text-xs text-[var(--color-text-muted)]">Reconectando…</p>}
              </div>
              {match.createdBy === p.user.id && (
                <span className="shrink-0 rounded-full bg-[var(--color-surface-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-orange)]">
                  Anfitrión
                </span>
              )}
            </div>
          );
        })}
        {Array.from({ length: emptySeats }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--color-border-strong)] p-2.5 text-[var(--color-text-muted)]"
          >
            <div className="h-9 w-9 shrink-0 rounded-full border border-dashed border-[var(--color-border-strong)]" />
            <p className="text-sm">Esperando jugador…</p>
          </div>
        ))}
      </div>

      <div className="flex w-full max-w-sm flex-col gap-2">
        {isHost ? (
          <>
            <button
              onClick={async () => {
                setStarting(true);
                try {
                  await onStart();
                } finally {
                  setStarting(false);
                }
              }}
              disabled={!canStart || starting}
              className="w-full rounded-full bg-[var(--color-coral)] py-2.5 text-sm font-bold text-white disabled:opacity-50 cursor-pointer"
            >
              {starting ? "Iniciando…" : "Iniciar partida"}
            </button>
            <button
              onClick={() => setConfirmAction("cancel")}
              className="w-full rounded-full bg-[var(--color-surface-secondary)] py-2.5 text-sm font-semibold cursor-pointer"
            >
              Cancelar partida
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmAction("leave")}
            className="w-full rounded-full bg-[var(--color-surface-secondary)] py-2.5 text-sm font-semibold cursor-pointer"
          >
            Salir de la sala
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === "cancel" ? "¿Cancelar la partida?" : "¿Salir de la sala?"}
        description={
          confirmAction === "cancel"
            ? "Se cancela para todos los que ya se unieron."
            : "Podés volver a unirte mientras la partida siga esperando jugadores."
        }
        confirmLabel={confirmAction === "cancel" ? "Cancelar partida" : "Salir"}
        busy={busy}
        danger
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
