"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { GradientButton } from "@/components/GradientButton";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { useOnboardingDraft } from "@/lib/OnboardingDraftContext";
import { useUsernameAvailability } from "@/lib/useUsernameAvailability";
import { isValidUsernameShape, USERNAME_MAX } from "@/lib/validation";

/** Nickname único y elegido por la persona — reemplaza el "user482913" autogenerado que quedaba
 * pegado si nunca lo editaba después (ver AuthService.generateUniqueUsername en menzoapi). Va
 * justo después de displayName: son campos distintos (displayName es libre y puede repetirse,
 * username es el handle único con el que se la busca en la lupa). */
export default function OnboardingUsernamePage() {
  const { draft, setUsername } = useOnboardingDraft();
  const router = useRouter();
  const [local, setLocal] = useState(draft.username);

  const shapeValid = isValidUsernameShape(local);
  const status = useUsernameAvailability(shapeValid ? local : "");
  const canContinue = shapeValid && status === "available";

  function handleContinue() {
    if (!canContinue) return;
    setUsername(local.trim().toLowerCase());
    router.push("/onboarding/avatar");
  }

  return (
    <div className="flex min-h-[80vh] flex-col justify-between gap-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold">Elegí tu nickname</h1>
          <p className="text-[var(--color-text-secondary)]">
            Así te van a poder buscar los demás. Único, sin espacios — letras, números, puntos o guiones bajos.
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1 border-b-2 border-[var(--color-border-strong)] pb-2 transition-colors focus-within:border-[var(--color-orange)]">
            <span className="text-2xl font-semibold text-[var(--color-text-muted)]">@</span>
            <input
              value={local}
              onChange={(e) => setLocal(e.target.value.toLowerCase().slice(0, USERNAME_MAX))}
              placeholder="tu_nickname"
              autoFocus
              className="flex-1 bg-transparent text-2xl font-semibold outline-none"
            />
            {shapeValid && status === "checking" && (
              <span className="text-xs text-[var(--color-text-muted)]">Buscando…</span>
            )}
            {shapeValid && status === "available" && <CheckIcon size={20} className="text-[var(--color-green)]" />}
            {shapeValid && (status === "taken" || status === "error") && (
              <CloseIcon size={18} className="text-[var(--color-coral)]" />
            )}
          </div>
          <span className="self-end text-xs text-[var(--color-text-muted)]">
            {local.length}/{USERNAME_MAX}
          </span>
        </div>

        {local.length > 0 && !shapeValid && (
          <p className="text-sm text-[var(--color-coral)]">
            Entre 3 y {USERNAME_MAX} caracteres — solo minúsculas, números, puntos o guiones bajos.
          </p>
        )}
        {shapeValid && status === "taken" && (
          <p className="text-sm text-[var(--color-coral)]">Ese nickname ya está en uso.</p>
        )}
        {shapeValid && status === "error" && (
          <p className="text-sm text-[var(--color-coral)]">No pudimos verificar la disponibilidad. Probá de nuevo.</p>
        )}
        {shapeValid && status === "available" && (
          <p className="text-sm text-[var(--color-green)]">@{local} está disponible.</p>
        )}
      </div>

      <GradientButton label="Ese es mi nickname" onClick={handleContinue} disabled={!canContinue} />
    </div>
  );
}
