"use client";

import { useRouter } from "next/navigation";

import { GradientButton } from "@/components/GradientButton";
import { interests } from "@/data/interests";
import { gradientCss } from "@/lib/theme";
import { useOnboardingDraft } from "@/lib/OnboardingDraftContext";

export default function OnboardingInterestsPage() {
  const { draft, toggleInterest } = useOnboardingDraft();
  const router = useRouter();
  const canContinue = draft.interests.length >= 1;

  return (
    <div className="flex min-h-[80vh] flex-col justify-between gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold">¿Qué te sigue haciendo sentir en casa?</h1>
          <p className="text-[var(--color-text-secondary)]">Elige entre 1 y 5 intereses.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => {
            const selected = draft.interests.includes(interest.id);
            const disabled = !selected && draft.interests.length >= 5;
            return (
              <button
                key={interest.id}
                onClick={() => toggleInterest(interest.id)}
                disabled={disabled}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected ? "text-white border-transparent" : "border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
                }`}
                style={selected ? { background: gradientCss(interest.gradient) } : undefined}
              >
                {interest.label}
              </button>
            );
          })}
        </div>
      </div>

      <GradientButton label="Continuar" onClick={() => router.push("/onboarding/confirm")} disabled={!canContinue} />
    </div>
  );
}
