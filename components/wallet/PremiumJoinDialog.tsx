"use client";

import { formatMc, MC_PREMIUM_PRICE, useWallet } from "@/lib/wallet/WalletContext";

import { MenzoCoin } from "./MenzoCoin";

/** "Esta comunidad cuesta 30 MC / mes ¿Quieres unirte?" — un click y entrás. */
export function PremiumJoinDialog({
  community,
  busy,
  onConfirm,
  onCancel,
}: {
  community: { name: string; color?: string | null } | null;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { balance } = useWallet();
  if (!community) return null;
  const enough = balance >= MC_PREMIUM_PRICE;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Unirte a ${community.name}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div className="menzo-fade-in relative flex w-full max-w-sm flex-col items-center gap-4 overflow-hidden rounded-3xl border border-[var(--color-yellow)]/25 bg-[var(--color-surface)] p-6 text-center shadow-2xl">
        <div
          className="pointer-events-none absolute -top-16 h-40 w-64 rounded-full blur-3xl"
          style={{ background: `radial-gradient(circle, ${community.color || "#ffbe2e"}55, transparent 70%)` }}
        />
        <span className="relative rounded-full bg-[var(--color-yellow)]/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-yellow)]">
          Comunidad premium
        </span>
        <div className="relative">
          <h2 className="font-display text-xl font-bold">{community.name}</h2>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Esta comunidad cuesta</p>
        </div>
        <div className="relative flex items-center gap-2">
          <MenzoCoin size={34} />
          <span className="font-display text-4xl font-bold text-[var(--color-yellow)]">{MC_PREMIUM_PRICE}</span>
          <span className="text-sm font-semibold text-[var(--color-text-muted)]">MC / mes</span>
        </div>
        <p className="relative text-sm font-medium">¿Quieres unirte?</p>
        <p className="relative text-xs text-[var(--color-text-muted)]">
          Tu saldo: <span className="font-semibold text-[var(--color-text-secondary)]">{formatMc(balance)} MC</span>
          {enough && <> → te quedan {formatMc(balance - MC_PREMIUM_PRICE)} MC</>}
        </p>
        {!enough && (
          <p className="relative rounded-xl bg-[var(--color-coral)]/10 px-3 py-2 text-xs text-[var(--color-coral)]">
            Te faltan {MC_PREMIUM_PRICE - balance} MC. Gana monedas con minijuegos y posts populares.
          </p>
        )}
        <div className="relative flex w-full gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 cursor-pointer rounded-full bg-[var(--color-surface-secondary)] py-2.5 text-sm font-semibold disabled:opacity-60"
          >
            Ahora no
          </button>
          <button
            onClick={onConfirm}
            disabled={busy || !enough}
            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--color-yellow)] to-[var(--color-orange)] py-2.5 text-sm font-bold text-[var(--color-text-on-accent)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "…" : <>Unirme · {MC_PREMIUM_PRICE} MC</>}
          </button>
        </div>
      </div>
    </div>
  );
}
