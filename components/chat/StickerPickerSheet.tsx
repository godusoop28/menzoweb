"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Sheet } from "@/components/ui/Sheet";
import { BackIcon, PlusIcon, StickerIcon } from "@/components/icons";
import { stickersApi } from "@/lib/api/endpoints";
import type { StickerDto, StickerPackSummaryDto } from "@/lib/api/types";

/** Modelado sobre GifPickerSheet (mismo patrón: sheet, buscador, grilla, estados de carga/vacío)
 * pero de dos niveles — primero se navega los packs (que agrupan varios stickers, a diferencia
 * de la grilla plana de Tenor), después se entra a uno para elegir un sticker puntual. */
export function StickerPickerSheet({ onPick, onClose }: { onPick: (sticker: StickerDto) => void; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [packs, setPacks] = useState<StickerPackSummaryDto[]>([]);
  const [openPackId, setOpenPackId] = useState<string | null>(null);
  const [openPackName, setOpenPackName] = useState<string>("");
  const [stickers, setStickers] = useState<StickerDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (openPackId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(false);
      stickersApi
        .listPacks(query.trim() || undefined)
        .then((res) => setPacks(res.items))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, openPackId]);

  function openPack(pack: StickerPackSummaryDto) {
    setOpenPackId(pack.id);
    setOpenPackName(pack.name);
    setLoading(true);
    setError(false);
    stickersApi
      .getPack(pack.id)
      .then((detail) => setStickers(detail.stickers))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  return (
    <Sheet open onClose={onClose} title={openPackId ? openPackName : "Stickers"} widthClassName="max-w-lg">
      <div className="flex flex-col gap-3">
        {openPackId ? (
          <button
            onClick={() => {
              setOpenPackId(null);
              setStickers([]);
            }}
            className="flex items-center gap-1 self-start text-sm text-[var(--color-text-muted)] cursor-pointer"
          >
            <BackIcon size={16} /> Volver a los packs
          </button>
        ) : (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar un pack…"
            className="w-full rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          />
        )}

        {error && (
          <p className="text-sm text-[var(--color-coral)]">No pudimos cargar los stickers — probá de nuevo en un rato.</p>
        )}
        {!error && loading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-cyan)]" />
          </div>
        )}

        {!error && !loading && !openPackId && packs.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              {query ? "Sin resultados." : "Todavía no hay packs de stickers."}
            </p>
            <button
              onClick={() => router.push("/stickers/create")}
              className="flex items-center gap-1.5 rounded-full bg-[var(--color-coral)] px-4 py-2 text-sm font-semibold text-white cursor-pointer"
            >
              <PlusIcon size={16} /> Crear tu propio pack
            </button>
          </div>
        )}
        {!error && !loading && !openPackId && packs.length > 0 && (
          <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            <button
              onClick={() => router.push("/stickers/create")}
              className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--color-border-strong)] p-2 text-[var(--color-text-muted)] cursor-pointer"
            >
              <span className="flex aspect-square w-full items-center justify-center">
                <PlusIcon size={22} />
              </span>
              <span className="truncate text-xs font-medium">Crear pack</span>
            </button>
            {packs.map((pack) => (
              <button
                key={pack.id}
                onClick={() => openPack(pack)}
                className="flex flex-col items-center gap-1 rounded-lg bg-[var(--color-surface-secondary)] p-2 cursor-pointer"
              >
                <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-black/20">
                  {pack.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pack.coverImageUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <StickerIcon size={24} className="text-[var(--color-text-muted)]" />
                  )}
                </span>
                <span className="truncate text-xs font-medium">{pack.name}</span>
              </button>
            ))}
          </div>
        )}

        {!error && !loading && openPackId && stickers.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Este pack no tiene stickers.</p>
        )}
        {!error && !loading && openPackId && stickers.length > 0 && (
          <div className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
            {stickers.map((sticker) => (
              <button
                key={sticker.id}
                onClick={() => onPick(sticker)}
                className="aspect-square overflow-hidden rounded-lg bg-black/10 p-1 cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sticker.imageUrl} alt="" className="h-full w-full object-contain" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
