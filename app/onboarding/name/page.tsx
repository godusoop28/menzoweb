"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { GradientButton } from "@/components/GradientButton";
import { useOnboardingDraft } from "@/lib/OnboardingDraftContext";
import { collapseSpaces, isValidDisplayName, NAME_MAX, NAME_MIN } from "@/lib/validation";

export default function OnboardingNamePage() {
  const { draft, setDisplayName } = useOnboardingDraft();
  const router = useRouter();
  const [localName, setLocalName] = useState(draft.displayName);

  const trimmed = collapseSpaces(localName).trim();
  const valid = isValidDisplayName(localName);

  function handleContinue() {
    if (!valid) return;
    setDisplayName(trimmed);
    router.push("/onboarding/aura");
  }

  return (
    <div className="flex min-h-[80vh] flex-col justify-between gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold">¿Cómo quieres que te recuerden?</h1>
          <p className="text-[var(--color-text-secondary)]">
            Puede ser tu antiguo apodo, tu nombre actual o una identidad completamente nueva.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <input
            value={localName}
            onChange={(e) => setLocalName(e.target.value.slice(0, NAME_MAX))}
            placeholder="Tu nombre visible"
            autoFocus
            className="border-b-2 border-[var(--color-border-strong)] bg-transparent pb-2 text-2xl font-semibold outline-none transition-colors focus:border-[var(--color-orange)]"
          />
          <span className="self-end text-xs text-[var(--color-text-muted)]">
            {trimmed.length}/{NAME_MAX}
          </span>
        </div>
        {localName.length > 0 && !valid && (
          <p className="text-sm text-[var(--color-coral)]">
            Usa entre {NAME_MIN} y {NAME_MAX} caracteres.
          </p>
        )}

        {trimmed.length >= NAME_MIN && (
          <div className="menzo-fade-in flex items-center gap-4 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]/70 p-5 backdrop-blur-md shadow-xl">
            <Avatar name={trimmed} gradient="fire" size={64} />
            <div>
              <p className="text-lg font-semibold">{trimmed}</p>
              <p className="text-sm text-[var(--color-text-muted)]">Acaba de regresar</p>
            </div>
          </div>
        )}
      </div>

      <GradientButton label="Ese soy yo" onClick={handleContinue} disabled={!valid} />
    </div>
  );
}
