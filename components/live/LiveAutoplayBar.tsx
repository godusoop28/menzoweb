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
      // z-[45]: antes compartía z-40 con LiveRoomPanel (el overlay fixed inset-0 del LIVE) — con
      // el mismo valor, el orden del DOM decidía, y el panel (que se monta después) tapaba este
      // aviso por completo apenas se abría el LIVE, dejando al usuario sin forma visible de
      // desbloquear el audio bloqueado por autoplay. Debe quedar SIEMPRE por encima del panel.
      className="fixed inset-x-0 top-0 z-[45] flex w-full items-center justify-center gap-2 bg-[var(--color-orange)] px-4 py-2 text-sm font-semibold text-black cursor-pointer"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-black/70" aria-hidden />
      Hay un LIVE activo · Toca para escuchar
    </button>
  );
}
