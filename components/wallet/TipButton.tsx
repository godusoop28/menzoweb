"use client";

import { useState } from "react";

import { useToast } from "@/lib/ToastContext";
import { MC_TIP_AMOUNT, useWallet } from "@/lib/wallet/WalletContext";

import { MenzoCoin } from "./MenzoCoin";

/** Botón morado "Tip 10 MC" — un toque y al creador le llegan las monedas. Muestra cuánto le
 * diste ya a ese post, y un "+10" que salta como feedback. */
export function TipButton({ postId, creatorName }: { postId: string; creatorName: string }) {
  const { tip, tipsByPost } = useWallet();
  const showToast = useToast();
  const [burst, setBurst] = useState(0);
  const given = tipsByPost[postId] ?? 0;

  function handleTip() {
    if (!tip(postId, creatorName)) {
      showToast("No te alcanzan las MC para esta propina");
      return;
    }
    setBurst((n) => n + 1);
    showToast(`Le enviaste ${MC_TIP_AMOUNT} MC a ${creatorName} 🎉`);
  }

  return (
    <button
      onClick={handleTip}
      aria-label={`Dar propina de ${MC_TIP_AMOUNT} MC a ${creatorName}`}
      title={given > 0 ? `Ya le diste ${given} MC a este post` : undefined}
      className="relative flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--color-purple)] to-[var(--color-violet)] px-3 py-1.5 text-xs font-bold text-white shadow-[0_4px_14px_rgba(139,92,246,0.35)] transition-transform hover:scale-[1.04] active:scale-95"
    >
      <MenzoCoin size={15} />
      Tip {MC_TIP_AMOUNT} MC
      {given > 0 && <span className="rounded-full bg-white/20 px-1.5 text-[10px]">{given}</span>}
      {burst > 0 && (
        <span
          key={burst}
          className="mc-coin-burst pointer-events-none absolute -top-1 left-1/2 flex items-center gap-0.5 text-[11px] font-bold text-[var(--color-yellow)]"
        >
          +{MC_TIP_AMOUNT}
          <MenzoCoin size={12} />
        </span>
      )}
    </button>
  );
}
