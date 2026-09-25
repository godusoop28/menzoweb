"use client";

import Link from "next/link";

import { formatMc, useWallet } from "@/lib/wallet/WalletContext";

import { MenzoCoin } from "./MenzoCoin";

/** Saldo siempre visible en el header, como el oro de un juego — toca para abrir la wallet. */
export function WalletPill({ compact = false }: { compact?: boolean }) {
  const { balance } = useWallet();
  return (
    <Link
      href="/wallet"
      aria-label={`Tu saldo: ${balance} Menzo Coins`}
      title="Tu wallet"
      className={`flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--color-yellow)]/30 bg-[var(--color-yellow)]/10 font-display font-bold text-[var(--color-yellow)] transition-colors hover:bg-[var(--color-yellow)]/20 ${
        compact ? "h-11 px-2.5 text-[13px]" : "px-3 py-1.5 text-sm"
      }`}
    >
      <MenzoCoin size={compact ? 18 : 20} />
      <span className="tabular-nums">{formatMc(balance)}</span>
      <span className="text-[11px] font-semibold opacity-80">MC</span>
    </Link>
  );
}
