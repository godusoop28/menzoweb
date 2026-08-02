"use client";

import { useEffect, useRef, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { gifsApi } from "@/lib/api/endpoints";
import type { GifResultDto } from "@/lib/api/types";

/** Buscador de GIFs — proxeado por el backend (ver TenorController), nunca le pega a Tenor
 * directo (la API key es solo del servidor). Sin query muestra "trending" como default, igual
 * que cualquier picker de GIF conocido (Discord, Slack, etc.). */
export function GifPickerSheet({ onPick, onClose }: { onPick: (gif: GifResultDto) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GifResultDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      setError(false);
      const call = query.trim() ? gifsApi.search(query.trim()) : gifsApi.trending();
      call
        .then((res) => setResults(res.results))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <Sheet open onClose={onClose} title="Buscar GIF" widthClassName="max-w-lg">
      <div className="flex flex-col gap-3">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar en Tenor…"
          className="w-full rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
        />
        {error && (
          <p className="text-sm text-[var(--color-coral)]">
            No pudimos buscar GIFs en este momento — probá de nuevo en un rato.
          </p>
        )}
        {!error && loading && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-cyan)]" />
          </div>
        )}
        {!error && !loading && results.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">Sin resultados.</p>
        )}
        {!error && !loading && results.length > 0 && (
          <div className="grid max-h-[60vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
            {results.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onPick(gif)}
                className="aspect-square overflow-hidden rounded-lg bg-black/30 cursor-pointer"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gif.previewUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </Sheet>
  );
}
