"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";

import { Avatar } from "@/components/Avatar";
import { GradientButton } from "@/components/GradientButton";
import { useOnboardingDraft } from "@/lib/OnboardingDraftContext";

export default function OnboardingAvatarPage() {
  const { draft, setAvatar } = useOnboardingDraft();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const uri = URL.createObjectURL(file);
    setAvatar(uri, file);
  }

  return (
    <div className="flex min-h-[80vh] flex-col justify-between gap-8">
      <div className="flex flex-col items-center gap-6">
        <div className="w-full flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold">Elige tu avatar</h1>
          <p className="text-[var(--color-text-secondary)]">
            Puedes usar una imagen o quedarte con tu inicial y tu aura. Ambas se ven bien.
          </p>
        </div>

        <div className="my-6">
          <Avatar name={draft.displayName || "?"} avatarUri={draft.avatarUri} gradient={draft.avatarGradient} size={140} />
        </div>

        <div className="flex w-full flex-col gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)] py-3 text-sm font-medium cursor-pointer"
          >
            Elegir desde el equipo
          </button>
          {!!draft.avatarUri && (
            <button
              onClick={() => setAvatar(undefined, undefined)}
              className="w-full rounded-full border border-[var(--color-border-soft)] py-3 text-sm font-medium text-[var(--color-text-secondary)] cursor-pointer"
            >
              Usar inicial en su lugar
            </button>
          )}
        </div>
      </div>

      <GradientButton label="Continuar" onClick={() => router.push("/onboarding/interests")} />
    </div>
  );
}
