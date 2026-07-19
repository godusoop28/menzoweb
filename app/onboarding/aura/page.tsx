"use client";

import { useRouter } from "next/navigation";

import { GradientButton } from "@/components/GradientButton";
import { auras } from "@/data/auras";
import { gradientCss } from "@/lib/theme";
import { useOnboardingDraft } from "@/lib/OnboardingDraftContext";

export default function OnboardingAuraPage() {
  const { draft, setAura } = useOnboardingDraft();
  const router = useRouter();

  return (
    <div className="flex min-h-[80vh] flex-col justify-between gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold">Elige tu aura</h1>
          <p className="text-[var(--color-text-secondary)]">El color que va a acompañar tu perfil por Menzo.</p>
        </div>

        <div className="flex flex-col gap-3">
          {auras.map((aura) => {
            const selected = draft.aura === aura.id;
            return (
              <button
                key={aura.id}
                onClick={() => setAura(aura.id)}
                className={`flex items-center gap-4 rounded-2xl border p-4 text-left transition-colors cursor-pointer ${
                  selected ? "border-[var(--color-border-strong)] bg-[var(--color-surface-soft)]" : "border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)]"
                }`}
              >
                <span
                  className="h-12 w-12 shrink-0 rounded-full"
                  style={{ background: gradientCss(aura.gradient) }}
                />
                <span>
                  <span className="block font-semibold">{aura.name}</span>
                  <span className="block text-sm text-[var(--color-text-muted)]">{aura.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <GradientButton label="Continuar" onClick={() => router.push("/onboarding/avatar")} />
    </div>
  );
}
