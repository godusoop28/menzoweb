"use client";

import { useEffect, useState } from "react";

import { CheckIcon } from "@/components/icons";
import { Sheet } from "@/components/ui/Sheet";
import { formatMc, formatMxn, TOPUP_PACKS, useWallet } from "@/lib/wallet/WalletContext";

import { MenzoCoin } from "./MenzoCoin";

type Step = "pick" | "processing" | "done";

/** Recargar MC — SIMULADO: no hay cobro real, solo muestra cómo se verá la compra de paquetes. */
export function TopUpSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { topUp } = useWallet();
  const [step, setStep] = useState<Step>("pick");
  const [packId, setPackId] = useState(TOPUP_PACKS[1].id);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setStep("pick");
  }

  useEffect(() => {
    if (step !== "processing") return;
    const timer = setTimeout(() => {
      topUp(packId);
      setStep("done");
    }, 1400);
    return () => clearTimeout(timer);
  }, [step, packId, topUp]);

  const pack = TOPUP_PACKS.find((p) => p.id === packId)!;

  const footer =
    step === "pick" ? (
      <button
        onClick={() => setStep("processing")}
        className="w-full cursor-pointer rounded-full bg-gradient-to-r from-[var(--color-yellow)] to-[var(--color-orange)] py-3 text-sm font-bold text-[var(--color-text-on-accent)]"
      >
        Pagar {formatMxn(pack.priceMxn)}
      </button>
    ) : step === "done" ? (
      <button onClick={onClose} className="w-full cursor-pointer rounded-full bg-[var(--color-surface-secondary)] py-3 text-sm font-bold">
        Listo
      </button>
    ) : null;

  return (
    <Sheet open={open} onClose={onClose} title="Recargar Menzo Coins" subtitle="Simulación · no se cobra nada" footer={footer}>
      {step === "pick" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {TOPUP_PACKS.map((p) => {
              const selected = p.id === packId;
              return (
                <button
                  key={p.id}
                  onClick={() => setPackId(p.id)}
                  className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border px-3 pb-3 pt-5 text-center transition-colors ${
                    selected
                      ? "border-[var(--color-yellow)]/70 bg-[var(--color-yellow)]/[0.08]"
                      : "border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  {p.tag && (
                    <span className="absolute -top-2 rounded-full bg-[var(--color-orange)] px-2 py-0.5 text-[10px] font-bold text-[var(--color-text-on-accent)]">
                      {p.tag}
                    </span>
                  )}
                  <MenzoCoin size={32} />
                  <span className="font-display text-xl font-bold text-[var(--color-yellow)]">{formatMc(p.mc)} MC</span>
                  <span className={`text-[11px] font-semibold ${p.bonus ? "text-[var(--color-green)]" : "text-transparent"}`}>
                    +{formatMc(p.bonus)} de regalo
                  </span>
                  <span className="mt-1 rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 text-xs font-bold">{formatMxn(p.priceMxn)}</span>
                </button>
              );
            })}
          </div>
          <p className="rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-[11px] leading-relaxed text-[var(--color-text-muted)]">
            Vista previa: al tocar pagar no se cobra nada, solo se suman MC de prueba a tu saldo demo.
          </p>
        </div>
      )}

      {step === "processing" && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="relative flex h-20 w-20 items-center justify-center">
            <span className="absolute inset-0 animate-spin rounded-full border-4 border-[var(--color-border-strong)] border-t-[var(--color-yellow)]" />
            <MenzoCoin size={40} />
          </div>
          <p className="font-display text-lg font-bold">Procesando pago…</p>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-yellow)]/15 text-[var(--color-yellow)]">
            <CheckIcon size={34} />
          </span>
          <p className="font-display text-xl font-bold">
            +{formatMc(pack.mc + pack.bonus)} MC
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">Ya están en tu wallet. (Simulación, no se cobró nada.)</p>
        </div>
      )}
    </Sheet>
  );
}
