"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { GradientButton } from "@/components/GradientButton";
import { auraById } from "@/data/auras";
import { interestById } from "@/data/interests";
import { ApiError } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { useOnboardingDraft } from "@/lib/OnboardingDraftContext";
import { gradientCss } from "@/lib/theme";

export default function OnboardingConfirmPage() {
  const { draft } = useOnboardingDraft();
  const { actions } = useAppState();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const aura = auraById(draft.aura);

  async function handleEnter() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await actions.completeOnboarding({
        displayName: draft.displayName,
        aura: draft.aura,
        avatarUri: draft.avatarUri,
        avatarFile: draft.avatarFile,
        avatarGradient: draft.avatarGradient,
        interests: draft.interests,
      });
      router.replace("/");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos completar tu perfil. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] flex-col justify-between gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold">Tu lugar sigue aquí.</h1>
          <p className="text-[var(--color-text-secondary)]">Bienvenido de vuelta, {draft.displayName}.</p>
        </div>

        <div className="rounded-3xl p-0.5" style={{ background: gradientCss(aura.gradient) }}>
          <div className="flex flex-col items-center gap-1 rounded-[calc(1.5rem-2px)] bg-black/30 px-8 py-10">
            <Avatar name={draft.displayName} avatarUri={draft.avatarUri} gradient={draft.avatarGradient} size={96} showOnline online />
            <p className="mt-3 text-xl font-semibold text-white">{draft.displayName}</p>
            <p className="text-sm text-white/75">Acaba de regresar · Aura {aura.name}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Intereses</p>
          <div className="flex flex-wrap gap-2">
            {draft.interests.map((id) => {
              const interest = interestById(id);
              if (!interest) return null;
              return (
                <span
                  key={id}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-white"
                  style={{ background: gradientCss(interest.gradient) }}
                >
                  {interest.label}
                </span>
              );
            })}
          </div>
        </div>

        {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
      </div>

      <GradientButton label="Entrar a Menzo" onClick={handleEnter} loading={submitting} />
    </div>
  );
}
