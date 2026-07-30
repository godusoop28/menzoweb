"use client";

import { useMenziDjContext } from "@/lib/music/MenziDjContext";

/** Igual que LiveAutoplayBar pero para Menzi DJ — el navegador puede bloquear la reproducción
 * automática con sonido; nunca se finge que está sonando mientras siga bloqueada (ver sección 14
 * del pedido). */
export function MenziDjAutoplayBar() {
  const { autoplayBlocked, unlockAutoplay } = useMenziDjContext();
  if (!autoplayBlocked) return null;

  return (
    <button
      onClick={unlockAutoplay}
      className="fixed inset-x-0 top-10 z-[65] flex w-full items-center justify-center gap-2 bg-[var(--color-cyan)] px-4 py-2 text-sm font-semibold text-black cursor-pointer"
    >
      <span className="h-2 w-2 animate-pulse rounded-full bg-black/70" aria-hidden />
      Menzi DJ está reproduciendo música · Toca para escuchar
    </button>
  );
}
