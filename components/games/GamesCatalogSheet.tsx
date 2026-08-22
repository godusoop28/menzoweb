"use client";

import { useEffect, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { GameIcon } from "@/components/icons";
import { ApiError, gamesApi } from "@/lib/api";
import type { GameCatalogEntryDto } from "@/lib/api/types";

/** Mismo patrón de sheet que StickerPickerSheet — acá sin niveles (una sola grilla de juegos, no
 * packs). El catálogo entero viene de GameCatalogController; los juegos con `available: false`
 * (todos salvo Ludo por ahora — ver GameCatalogService en menzoapi) se muestran igual con la
 * etiqueta "Disponible pronto", no se ocultan, para que se note el roadmap. */
export function GamesCatalogSheet({
  roomId,
  onCreated,
  onClose,
}: {
  roomId: string;
  onCreated: (matchId: string) => void;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<GameCatalogEntryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState<string | null>(null);

  useEffect(() => {
    gamesApi
      .catalog()
      .then(setEntries)
      .catch(() => setError("No pudimos cargar los juegos — probá de nuevo en un rato."))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(entry: GameCatalogEntryDto) {
    if (creatingType) return;
    setCreatingType(entry.gameType);
    setError(null);
    try {
      const match = await gamesApi.createRoomMatch(roomId, { gameType: entry.gameType, joinMode: "OPEN" });
      onCreated(match.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la partida.");
    } finally {
      setCreatingType(null);
    }
  }

  return (
    <Sheet open onClose={onClose} title="Juegos" widthClassName="max-w-lg">
      <div className="flex flex-col gap-3">
        {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-cyan)]" />
          </div>
        ) : (
          <div className="flex max-h-[65vh] flex-col gap-2 overflow-y-auto">
            {entries.map((entry) => (
              <div
                key={entry.gameType}
                className={`flex items-center gap-3 rounded-xl bg-[var(--color-surface-secondary)] p-3 ${!entry.available ? "opacity-60" : ""}`}
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-soft)] text-[var(--color-cyan)]">
                  <GameIcon size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{entry.name}</p>
                  <p className="truncate text-xs text-[var(--color-text-muted)]">{entry.description}</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {entry.minPlayers === entry.maxPlayers
                      ? `${entry.minPlayers} jugadores`
                      : `${entry.minPlayers}-${entry.maxPlayers} jugadores`}
                  </p>
                </div>
                {entry.available ? (
                  <button
                    onClick={() => handleCreate(entry)}
                    disabled={creatingType !== null}
                    className="shrink-0 rounded-full bg-[var(--color-coral)] px-3.5 py-1.5 text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
                  >
                    {creatingType === entry.gameType ? "Creando…" : "Crear"}
                  </button>
                ) : (
                  <span className="shrink-0 rounded-full bg-[var(--color-surface-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--color-text-muted)]">
                    Disponible pronto
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
