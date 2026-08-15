"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { CommunityBadge } from "@/components/communities/CommunitySwitcher";
import { GradientButton } from "@/components/GradientButton";
import { communitiesApi } from "@/lib/api";
import type { CommunitySummaryDto } from "@/lib/api/types";
import { useOnboardingDraft } from "@/lib/OnboardingDraftContext";

/** Al menos una comunidad es obligatoria para poder avanzar (ver Contexto: "debe elegir al menos
 * una") — el backend vuelve a exigirlo igual (OnboardingRequest.communityIds, @NotEmpty). La
 * selección queda solo en el draft local; el join real ocurre recién al completar el onboarding
 * (ver UserService.completeOnboarding en menzoapi), mismo criterio que displayName/avatar/
 * interests, que tampoco pegan al backend hasta el paso final. */
export default function OnboardingCommunitiesPage() {
  const { draft, toggleCommunity } = useOnboardingDraft();
  const router = useRouter();
  const [communities, setCommunities] = useState<CommunitySummaryDto[]>([]);
  const [loading, setLoading] = useState(true);
  // Sin esto, un cold-start de Render (o cualquier hiccup de red justo en la cuenta recién
  // creada) dejaba `communities` vacío en silencio para siempre: "Todavía no hay comunidades
  // disponibles" con el botón Continuar deshabilitado y ninguna forma de reintentar — la cuenta
  // quedaba efectivamente atascada a mitad de registro. Este es el bug reportado de "no le salen
  // las comunidades al crear cuenta".
  const [error, setError] = useState(false);

  function loadCommunities() {
    setLoading(true);
    setError(false);
    communitiesApi
      .list(0, 50)
      .then((page) => setCommunities(page.items))
      .catch((err) => {
        console.warn("[menzo/web] communities list failed", err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reintentable fetch on mount, not derived render state
    loadCommunities();
  }, []);

  const canContinue = draft.communityIds.length >= 1;

  return (
    <div className="flex min-h-[80vh] flex-col justify-between gap-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-3xl font-bold">¿En qué comunidades querés estar?</h1>
          <p className="text-[var(--color-text-secondary)]">Elegí al menos una para empezar — podés sumarte a más después.</p>
        </div>

        {loading && <p className="text-sm text-[var(--color-text-muted)]">Cargando…</p>}
        {!loading && error && (
          <div className="flex flex-col items-start gap-2 rounded-2xl border border-[var(--color-coral)]/40 bg-[var(--color-coral)]/10 p-4">
            <p className="text-sm text-[var(--color-coral)]">No pudimos cargar las comunidades disponibles.</p>
            <button
              onClick={loadCommunities}
              className="rounded-full bg-[var(--color-coral)] px-4 py-2 text-xs font-bold text-white cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}
        {!loading && !error && communities.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">Todavía no hay comunidades disponibles.</p>
        )}

        <div className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto pr-1">
          {communities.map((community) => {
            const selected = draft.communityIds.includes(community.id);
            return (
              <button
                key={community.id}
                onClick={() => toggleCommunity(community.id)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors cursor-pointer ${
                  selected
                    ? "border-[var(--color-orange)] bg-[var(--color-orange)]/15"
                    : "border-[var(--color-border-soft)] bg-[var(--color-surface)]/60 hover:bg-[var(--color-surface-secondary)]/80"
                }`}
              >
                <CommunityBadge name={community.name} iconUrl={community.iconUrl} color={community.primaryColor} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{community.name}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{community.memberCount} miembros</p>
                </div>
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? "border-[var(--color-orange)] bg-[var(--color-orange)]" : "border-[var(--color-text-muted)]"
                  }`}
                  aria-hidden
                >
                  {selected && <span className="text-xs text-black">✓</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => router.push("/onboarding/interests")}
          className="rounded-full border border-[var(--color-border-soft)] px-6 py-3 text-sm font-semibold cursor-pointer"
        >
          Atrás
        </button>
        <div className="flex-1">
          <GradientButton label="Continuar" onClick={() => router.push("/onboarding/confirm")} disabled={!canContinue} />
        </div>
      </div>
    </div>
  );
}
