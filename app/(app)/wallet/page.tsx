"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CompassIcon, CrownIcon, GameIcon, HeartIcon } from "@/components/icons";
import { CashOutSheet } from "@/components/wallet/CashOutSheet";
import { MenzoCoin } from "@/components/wallet/MenzoCoin";
import { TopUpSheet } from "@/components/wallet/TopUpSheet";
import { relativeTime } from "@/lib/time";
import {
  formatMc,
  formatMxn,
  formatXlm,
  mcToXlm,
  mxnToXlm,
  MXN_PER_XLM,
  XLM_LOGO,
  mcToMxn,
  MC_MIN_WITHDRAW,
  MC_TO_MXN,
  PAYOUT_METHODS,
  withdrawStatus,
  MC_GAME_WIN_REWARD,
  MC_POPULAR_POST_LIKES,
  MC_POPULAR_POST_REWARD,
  MC_PREMIUM_PRICE,
  MC_TIP_AMOUNT,
  useWallet,
  type WalletTx,
} from "@/lib/wallet/WalletContext";

const TX_STYLE: Record<WalletTx["kind"], { label: string; color: string }> = {
  tip_sent: { label: "Propina", color: "var(--color-violet)" },
  premium: { label: "Premium", color: "var(--color-orange)" },
  reward: { label: "Recompensa", color: "var(--color-yellow)" },
  welcome: { label: "Bienvenida", color: "var(--color-green)" },
  withdraw: { label: "Retiro", color: "var(--color-green)" },
  topup: { label: "Recarga", color: "var(--color-yellow)" },
};

/** Wallet de Menzo Coins — MODO DEMO: saldo e historial son locales, sin wallet real conectada. */
export default function WalletPage() {
  const { balance, history, reward } = useWallet();
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const [topUpOpen, setTopUpOpen] = useState(false);
  // Reloj para que los retiros pasen solos de "En proceso" a "Completado" (simulado).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const spent = history.filter((t) => t.amount < 0 && t.kind !== "withdraw").reduce((sum, t) => sum - t.amount, 0);
  const earned = history.filter((t) => t.amount > 0 && t.kind !== "welcome").reduce((sum, t) => sum + t.amount, 0);
  const withdrawnMxn = history.filter((t) => t.kind === "withdraw").reduce((sum, t) => sum + (t.fiatMxn ?? 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      {/* Saldo */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--color-yellow)]/25 bg-[var(--color-surface)] p-6">
        <div
          className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(255,190,46,0.35), transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.3), transparent 70%)" }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Tu saldo</p>
            <div className="mt-2 flex items-center gap-3">
              <MenzoCoin size={44} />
              <span className="font-display text-5xl font-bold tabular-nums text-[var(--color-yellow)]">{formatMc(balance)}</span>
              <span className="self-end pb-1.5 font-display text-lg font-bold text-[var(--color-text-secondary)]">MC</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="font-display text-lg font-semibold text-[var(--color-text-primary)]">≈ {formatMxn(mcToMxn(balance))}</p>
              <span
                className="flex items-center gap-1.5 rounded-full border border-[var(--color-border-soft)] bg-black/30 py-0.5 pl-0.5 pr-2.5 text-sm font-semibold"
                title={`Aproximado · 1 XLM ≈ ${formatMxn(MXN_PER_XLM)}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={XLM_LOGO} alt="Stellar Lumens" width={22} height={22} className="rounded-full" />≈ {formatXlm(mcToXlm(balance))}
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Menzo Coins · la misma moneda en todas tus comunidades</p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
            Demo
          </span>
        </div>
        <div className="relative mt-5 grid grid-cols-2 gap-3">
          <button
            onClick={() => setCashOutOpen(true)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-green)] to-[var(--color-cyan)] py-3 text-sm font-bold text-[var(--color-text-on-accent)] transition-transform hover:scale-[1.02] active:scale-95"
          >
            <span className="text-base leading-none">↗</span> Retirar a pesos
          </button>
          <button
            onClick={() => setTopUpOpen(true)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--color-yellow)] to-[var(--color-orange)] py-3 text-sm font-bold text-[var(--color-text-on-accent)] transition-transform hover:scale-[1.02] active:scale-95"
          >
            <span className="text-base leading-none">+</span> Recargar MC
          </button>
          <div className="rounded-2xl bg-[var(--color-surface-secondary)] px-4 py-3">
            <p className="text-[11px] text-[var(--color-text-muted)]">Ganado</p>
            <p className="font-display text-lg font-bold text-[var(--color-green)]">+{formatMc(earned)} MC</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-surface-secondary)] px-4 py-3">
            <p className="text-[11px] text-[var(--color-text-muted)]">Gastado</p>
            <p className="font-display text-lg font-bold text-[var(--color-text-secondary)]">−{formatMc(spent)} MC</p>
          </div>
          <div className="col-span-2 flex items-center justify-between rounded-2xl bg-[var(--color-surface-secondary)] px-4 py-3">
            <div>
              <p className="text-[11px] text-[var(--color-text-muted)]">Retirado a pesos</p>
              <p className="font-display text-lg font-bold text-[var(--color-green)]">{formatMxn(withdrawnMxn)}</p>
            </div>
            <p className="text-right text-[11px] leading-snug text-[var(--color-text-muted)]">
              1 MC = {formatMxn(MC_TO_MXN)}
              <br />
              1 XLM ≈ {formatMxn(MXN_PER_XLM)}
              <br />
              Retiro mínimo {MC_MIN_WITHDRAW} MC
            </p>
          </div>
        </div>
      </section>

      {/* Para qué sirve */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Para qué sirven tus MC</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <UseCard
            icon={<HeartIcon size={20} filled />}
            color="var(--color-violet)"
            title="Propinas"
            text={`¿Viste un arte chido? Toca "Tip ${MC_TIP_AMOUNT} MC" y al creador le llega al instante.`}
          />
          <UseCard
            icon={<CrownIcon size={20} />}
            color="var(--color-orange)"
            title="Comunidades premium"
            text={`Entra a comunidades privadas por ${MC_PREMIUM_PRICE} MC / mes, con un solo click.`}
          />
          <UseCard
            icon={<GameIcon size={20} />}
            color="var(--color-yellow)"
            title="Recompensas"
            text="Gana monedas jugando y cuando tus posts le gustan a la comunidad."
          />
        </div>
      </section>

      {/* Cómo ganar */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Cómo ganar MC</h2>
        <div className="menzo-panel flex flex-col divide-y divide-[var(--color-border-soft)]">
          <EarnRow title="Gana un minijuego" detail="Ludo, Menzo Cards y más" amount={MC_GAME_WIN_REWARD} />
          <EarnRow title={`Tu post llega a ${MC_POPULAR_POST_LIKES} me gusta`} detail="Una vez por post" amount={MC_POPULAR_POST_REWARD} />
          <EarnRow title="Recibe propinas" detail="Cada tip de otro miembro" amount={MC_TIP_AMOUNT} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/communities"
            className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface-secondary)] px-4 py-2 text-xs font-semibold"
          >
            <CompassIcon size={15} /> Ver comunidades premium
          </Link>
          <button
            onClick={() => reward(MC_POPULAR_POST_REWARD, "Recompensa de prueba")}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-[var(--color-yellow)]/40 px-4 py-2 text-xs font-semibold text-[var(--color-yellow)]"
          >
            <MenzoCoin size={14} /> Probar recompensa (demo)
          </button>
        </div>
      </section>

      {/* Historial */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Historial</h2>
        <div className="menzo-panel flex flex-col divide-y divide-[var(--color-border-soft)]">
          {history.map((tx) => {
            const style = TX_STYLE[tx.kind] ?? TX_STYLE.reward;
            const status = tx.kind === "withdraw" ? withdrawStatus(tx, now) : null;
            const methodName = tx.method ? PAYOUT_METHODS.find((m) => m.id === tx.method)?.name : undefined;
            return (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `color-mix(in srgb, ${style.color} 16%, transparent)` }}
                >
                  <MenzoCoin size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{tx.label}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    <span style={{ color: style.color }}>{style.label}</span> · {relativeTime(tx.createdAt)}
                    {status && (
                      <>
                        {" · "}
                        <span className={status === "processing" ? "text-[var(--color-yellow)]" : "text-[var(--color-green)]"}>
                          {status === "processing" ? "En proceso" : "Completado"}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <span className="flex flex-col items-end">
                  <span
                    className={`font-display text-sm font-bold tabular-nums ${
                      tx.amount > 0 ? "text-[var(--color-green)]" : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : "−"}
                    {formatMc(tx.amount)} MC
                  </span>
                  {tx.fiatMxn != null && (
                    <span className="text-[11px] text-[var(--color-text-muted)]" title={methodName}>
                      {tx.kind === "withdraw"
                        ? tx.method === "stellar"
                          ? `→ ≈ ${formatXlm(mxnToXlm(tx.fiatMxn))}`
                          : `→ ${formatMxn(tx.fiatMxn)}`
                        : `pagaste ${formatMxn(tx.fiatMxn)}`}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <p className="pb-4 text-center text-[11px] text-[var(--color-text-muted)]">
        Vista previa de Menzo Coins. Tu saldo, retiros y recargas son simulados, se guardan solo en este dispositivo y
        todavía no mueven dinero real.
      </p>

      <CashOutSheet open={cashOutOpen} onClose={() => setCashOutOpen(false)} />
      <TopUpSheet open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </div>
  );
}

function UseCard({ icon, color, title, text }: { icon: React.ReactNode; color: string; title: string; text: string }) {
  return (
    <div className="menzo-panel flex flex-col gap-2 p-4">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ color, background: `color-mix(in srgb, ${color} 16%, transparent)` }}
      >
        {icon}
      </span>
      <p className="text-sm font-bold">{title}</p>
      <p className="text-xs leading-relaxed text-[var(--color-text-secondary)]">{text}</p>
    </div>
  );
}

function EarnRow({ title, detail, amount }: { title: string; detail: string; amount: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{detail}</p>
      </div>
      <span className="flex items-center gap-1 font-display text-sm font-bold text-[var(--color-yellow)]">
        +{amount} <MenzoCoin size={16} />
      </span>
    </div>
  );
}
