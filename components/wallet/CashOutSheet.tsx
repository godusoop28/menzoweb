"use client";

import { useEffect, useState } from "react";

import { CheckIcon } from "@/components/icons";
import { Sheet } from "@/components/ui/Sheet";
import {
  formatMc,
  formatMxn,
  formatXlm,
  mxnToXlm,
  MXN_PER_XLM,
  XLM_LOGO,
  MC_MIN_WITHDRAW,
  MC_TO_MXN,
  MC_WITHDRAW_FEE,
  PAYOUT_METHODS,
  useWallet,
  withdrawQuote,
  type WalletTx,
} from "@/lib/wallet/WalletContext";

import { MenzoCoin } from "./MenzoCoin";

function XlmLogo({ size = 18 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={XLM_LOGO} alt="Stellar Lumens" width={size} height={size} className="shrink-0 rounded-full" />;
}

type Step = "form" | "processing" | "done";

/** Retirar MC a dinero real — SIMULADO: no se conecta a ningún banco ni pasarela. Muestra el
 * flujo completo (monto → método → procesando → comprobante) tal como se verá con pagos reales. */
export function CashOutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { balance, withdraw } = useWallet();
  const [step, setStep] = useState<Step>("form");
  const [amountText, setAmountText] = useState("");
  const [methodId, setMethodId] = useState(PAYOUT_METHODS[0].id);
  const [receipt, setReceipt] = useState<WalletTx | null>(null);

  // Cada vez que se abre, arranca de cero.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep("form");
      setAmountText(balance >= MC_MIN_WITHDRAW ? String(balance) : "");
      setReceipt(null);
    }
  }

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => setStep("done"), 1600);
    return () => clearTimeout(timer);
  }, [step]);

  const amount = Math.floor(Number(amountText) || 0);
  const quote = withdrawQuote(amount);
  const method = PAYOUT_METHODS.find((m) => m.id === methodId)!;
  const toStellar = method.id === "stellar";
  const error =
    amountText === ""
      ? null
      : amount < MC_MIN_WITHDRAW
        ? `El retiro mínimo es de ${MC_MIN_WITHDRAW} MC`
        : amount > balance
          ? "No tienes tantas MC"
          : null;
  const canSubmit = amountText !== "" && !error;

  function handleSubmit() {
    const tx = withdraw(amount, methodId);
    if (!tx) return;
    setReceipt(tx);
    setStep("processing");
  }

  const footer =
    step === "form" ? (
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full cursor-pointer rounded-full bg-gradient-to-r from-[var(--color-green)] to-[var(--color-cyan)] py-3 text-sm font-bold text-[var(--color-text-on-accent)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {canSubmit ? `Retirar ${toStellar ? `≈ ${formatXlm(mxnToXlm(quote.net))}` : formatMxn(quote.net)}` : "Retirar"}
      </button>
    ) : step === "done" ? (
      <button
        onClick={onClose}
        className="w-full cursor-pointer rounded-full bg-[var(--color-surface-secondary)] py-3 text-sm font-bold"
      >
        Listo
      </button>
    ) : null;

  return (
    <Sheet open={open} onClose={onClose} title="Retirar a dinero real" subtitle="Simulación · no se mueve dinero real" footer={footer}>
      {step === "form" && (
        <div className="flex flex-col gap-5">
          {/* Monto */}
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <label htmlFor="cashout-amount" className="text-sm font-semibold">
                ¿Cuántas MC quieres retirar?
              </label>
              <span className="text-xs text-[var(--color-text-muted)]">Disponible: {formatMc(balance)} MC</span>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 focus-within:border-[var(--color-yellow)]/60">
              <MenzoCoin size={28} />
              <input
                id="cashout-amount"
                inputMode="numeric"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value.replace(/\D/g, "").slice(0, 7))}
                placeholder="0"
                className="w-full bg-transparent font-display text-3xl font-bold tabular-nums outline-none placeholder:text-[var(--color-text-muted)]"
              />
              <span className="font-display text-sm font-bold text-[var(--color-text-muted)]">MC</span>
            </div>
            <div className="flex gap-2">
              {[
                { label: "25 %", value: Math.floor(balance * 0.25) },
                { label: "50 %", value: Math.floor(balance * 0.5) },
                { label: "Todo", value: balance },
              ].map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => setAmountText(String(chip.value))}
                  className="flex-1 cursor-pointer rounded-full bg-[var(--color-surface-secondary)] py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-[var(--color-coral)]">{error}</p>}
          </div>

          {/* Conversión */}
          <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border-soft)] p-4 text-sm">
            <Row label="Tipo de cambio" value={`1 MC = ${formatMxn(MC_TO_MXN)}`} />
            <Row label={`${formatMc(amount)} MC equivalen a`} value={formatMxn(quote.gross)} />
            <Row label={`Comisión (${MC_WITHDRAW_FEE * 100} %)`} value={`−${formatMxn(quote.fee)}`} />
            <div className="my-1 border-t border-[var(--color-border-soft)]" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Recibes</span>
              <span className="font-display text-xl font-bold text-[var(--color-green)]">{formatMxn(quote.net)}</span>
            </div>
            {/* Conversión aproximada a Lumens — siempre visible, aunque se retire a pesos. */}
            <div className="mt-1 flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2">
              <span className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <XlmLogo size={20} />
                En Lumens (Stellar)
              </span>
              <span className="text-right">
                <span className="block font-display text-base font-bold">≈ {formatXlm(mxnToXlm(quote.net))}</span>
                <span className="block text-[10px] text-[var(--color-text-muted)]">1 XLM ≈ {formatMxn(MXN_PER_XLM)} · aprox.</span>
              </span>
            </div>
          </div>

          {/* Método */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold">¿A dónde lo enviamos?</p>
            {PAYOUT_METHODS.map((m) => {
              const selected = m.id === methodId;
              return (
                <button
                  key={m.id}
                  onClick={() => setMethodId(m.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-[var(--color-green)]/60 bg-[var(--color-green)]/[0.07]"
                      : "border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  {m.logo ? (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center">
                      <XlmLogo size={36} />
                    </span>
                  ) : (
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-sm font-bold"
                      style={{ background: `color-mix(in srgb, ${m.color} 18%, transparent)`, color: m.color }}
                    >
                      {m.name[0]}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{m.name}</span>
                    <span className="block text-xs text-[var(--color-text-muted)]">
                      {m.detail} · {m.eta}
                    </span>
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-[var(--color-green)] bg-[var(--color-green)] text-[var(--color-text-on-accent)]" : "border-[var(--color-border-strong)]"
                    }`}
                  >
                    {selected && <CheckIcon size={12} />}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
            Vista previa: las cuentas mostradas son de ejemplo y no se envía dinero real. Cuando los retiros estén
            activos, tendrás que verificar tu identidad y vincular tu cuenta.
          </p>
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 animate-spin rounded-full border-4 border-[var(--color-border-strong)] border-t-[var(--color-green)]" />
            <MenzoCoin size={40} />
          </div>
          <p className="font-display text-lg font-bold">Procesando tu retiro…</p>
          <p className="text-sm text-[var(--color-text-muted)]">Convirtiendo {formatMc(amount)} MC a pesos</p>
        </div>
      )}

      {step === "done" && receipt && (
        <div className="flex flex-col items-center gap-5 py-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-green)]/15 text-[var(--color-green)]">
            <CheckIcon size={34} />
          </span>
          <div>
            <p className="font-display text-xl font-bold">¡Retiro solicitado!</p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Te llegarán{" "}
              <span className="font-bold text-[var(--color-green)]">
                {toStellar ? `≈ ${formatXlm(mxnToXlm(receipt.fiatMxn ?? 0))}` : formatMxn(receipt.fiatMxn ?? 0)}
              </span>{" "}
              a{" "}
              {method.name} · {method.eta.toLowerCase()}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 rounded-2xl border border-[var(--color-border-soft)] p-4 text-left text-sm">
            <Row label="Folio" value={`MZ-${receipt.id.slice(0, 8).toUpperCase()}`} />
            <Row label="Retiraste" value={`${formatMc(-receipt.amount)} MC`} />
            {toStellar && <Row label="Equivale a" value={formatMxn(receipt.fiatMxn ?? 0)} />}
            <Row label="Destino" value={`${method.name} · ${method.detail}`} />
            <Row label="Estado" value="En proceso" valueClassName="text-[var(--color-yellow)]" />
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)]">Simulación: no se movió dinero real.</p>
        </div>
      )}
    </Sheet>
  );
}

function Row({ label, value, valueClassName = "" }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className={`text-right font-semibold tabular-nums ${valueClassName}`}>{value}</span>
    </div>
  );
}
