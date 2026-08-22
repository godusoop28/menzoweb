import { Avatar } from "@/components/Avatar";
import { mapUserSummary } from "@/lib/api/mappers";
import type { GameType, MatchPlayerSummaryDto, MatchStatus } from "@/lib/api/types";

/** Nombre para mostrar por juego — hoy solo LUDO tiene motor real (ver GameCatalogService en
 * menzoapi), el resto son los mismos 4 nombres que ya vio el usuario en el catálogo ("Disponible
 * pronto"). Se hardcodea acá en vez de pedir /api/games/catalog de nuevo por cada tarjeta —
 * mismo criterio que LevelDefinition/badges: catálogo estático de producto. */
export const GAME_DISPLAY_NAME: Record<GameType, string> = {
  TIC_TAC_TOE: "Tres en línea",
  LUDO: "Ludo",
  MENZO_CARDS: "Menzo Cards",
  MENZO_CITY: "Menzo City",
  MONSTER_BATTLE: "Monster Battle",
  DRAW_AND_GUESS: "Dibuja y Adivina",
};

const LOBBY_STATUSES: MatchStatus[] = ["WAITING", "READY", "STARTING"];
const ACTIVE_STATUSES: MatchStatus[] = ["PLAYING", "PAUSED"];

export function isLobbyStatus(status: MatchStatus): boolean {
  return LOBBY_STATUSES.includes(status);
}
export function isActiveStatus(status: MatchStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function statusLabel(status: MatchStatus): string {
  switch (status) {
    case "WAITING":
      return "Esperando jugadores";
    case "READY":
      return "Listo para comenzar";
    case "STARTING":
      return "Iniciando…";
    case "PLAYING":
      return "Partida en curso";
    case "PAUSED":
      return "Partida en pausa — reconectando";
    case "FINISHED":
      return "Partida finalizada";
    case "CANCELLED":
      return "Partida cancelada";
    case "ABANDONED":
      return "Partida abandonada";
    case "ERROR":
      return "Error en la partida";
  }
}

/** Fila de avatares de jugadores — usado tanto en la tarjeta de invitación (chat) como en el
 * lobby. `mapUserSummary(user, null)` a propósito: acá NO se alía el id propio a LOCAL_USER_ID
 * (ese aliasing es del store viejo de demo-data) — todo lo de juegos compara directo contra
 * getMyRealId(). */
export function PlayerAvatarsRow({ players, size = 28 }: { players: MatchPlayerSummaryDto[]; size?: number }) {
  return (
    <div className="flex items-center -space-x-2">
      {players.map((p) => {
        const user = mapUserSummary(p.user, null);
        return (
          <div key={user.id} className="relative shrink-0 rounded-full ring-2 ring-[var(--color-background)]">
            <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={size} />
            {!p.connected && (
              <span
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-text-muted)] ring-2 ring-[var(--color-background)]"
                title="Desconectado"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
