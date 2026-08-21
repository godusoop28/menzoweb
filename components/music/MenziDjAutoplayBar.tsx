"use client";

import { useMenziDjContext } from "@/lib/music/MenziDjContext";

/** Igual que LiveAutoplayBar pero para DJ Menzi — el navegador puede bloquear la reproducción
 * automática con sonido; nunca se finge que está sonando mientras siga bloqueada (ver sección 14
 * del pedido). También cubre `needsManualResume` (sección 5/6 del pedido de auditoría de
 * confiabilidad): solo aparece cuando la recuperación automática de una pausa inesperada ya
 * agotó sus intentos — nunca ante el primer problema, ver attemptUnexpectedPauseRecovery en
 * MenziDjContext.tsx. */
export function MenziDjAutoplayBar() {
  const { autoplayBlocked, needsManualResume, unlockAutoplay } = useMenziDjContext();
  if (!autoplayBlocked && !needsManualResume) return null;

  return (
    <button
      onClick={unlockAutoplay}
      // z-[46]: un escalón por encima de LiveAutoplayBar (z-[45], mismo motivo — no debe quedar
      // tapada por LiveRoomPanel) y siempre por encima de esa otra barra en su stacking order,
      // coherente con que se pinta 10px más abajo en pantalla (top-10) para no superponerse.
      className="fixed inset-x-0 top-10 z-[46] flex w-full items-center justify-center gap-2 bg-[var(--color-cyan)] px-4 py-2 text-sm font-semibold text-black cursor-pointer"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-black/70" aria-hidden />
      {needsManualResume ? "DJ Menzi se pausó · Toca para continuar" : "DJ Menzi está reproduciendo música · Toca para escuchar"}
    </button>
  );
}
