"use client";

import { useEffect } from "react";

import { MenzoCoin } from "./MenzoCoin";

/** Notificación de recompensa "+15 MC por tu aporte" — más festiva que el Toast normal para que
 * se sienta como un logro de juego. */
export function RewardToast({
  reward,
  onHide,
}: {
  reward: { id: string; amount: number; reason: string } | null;
  onHide: () => void;
}) {
  useEffect(() => {
    if (!reward) return;
    const timer = setTimeout(onHide, 4200);
    return () => clearTimeout(timer);
  }, [reward, onHide]);

  if (!reward) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[calc(5.5rem+env(safe-area-inset-top))] z-[80] flex justify-center px-4 md:top-20">
      <button
        key={reward.id}
        onClick={onHide}
        className="mc-reward-pop pointer-events-auto flex cursor-pointer items-center gap-3 rounded-2xl border border-[var(--color-yellow)]/40 bg-[var(--color-surface-elevated)] py-2.5 pl-2.5 pr-5 text-left shadow-[0_10px_40px_rgba(255,190,46,0.25)]"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-yellow)]/15">
          <MenzoCoin size={30} className="mc-coin-spin" />
        </span>
        <span className="flex flex-col">
          <span className="font-display text-lg font-bold leading-tight text-[var(--color-yellow)]">+{reward.amount} MC</span>
          <span className="text-xs text-[var(--color-text-secondary)]">{reward.reason} · por tu aporte</span>
        </span>
      </button>
    </div>
  );
}
