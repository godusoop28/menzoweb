"use client";

import { useLiveRoomContext } from "@/lib/live/LiveRoomContext";

/** Barra fija: el navegador bloqueó la reproducción automática del audio del LIVE hasta que haya
 * una interacción real del usuario (política estándar de autoplay). Nunca se oculta este estado
 * ni se muestra la llamada como "conectada" mientras el audio sigue bloqueado — ver sección 11. */
export function LiveAutoplayBar() {
  const { autoplayBlocked, unlockAudio } = useLiveRoomContext();
  if (!autoplayBlocked) return null;

  return (
    <button
      onClick={unlockAudio}
      className="fixed inset-x-0 top-0 z-40 flex w-full items-center justify-center gap-2 bg-[var(--color-orange)] px-4 py-2 text-sm font-semibold text-black cursor-pointer"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-black/70" aria-hidden />
      Hay un LIVE activo · Toca para escuchar
    </button>
  );
}
