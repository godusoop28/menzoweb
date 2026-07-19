"use client";

import { createContext, useContext, useMemo, useState } from "react";

import { auraById } from "@/data/auras";
import type { GradientId } from "@/lib/theme";
import type { AuraId, InterestId } from "@/lib/types";

type OnboardingDraft = {
  displayName: string;
  aura: AuraId;
  avatarUri?: string;
  avatarFile?: File;
  avatarGradient: GradientId;
  interests: InterestId[];
};

type OnboardingDraftContextValue = {
  draft: OnboardingDraft;
  setDisplayName: (value: string) => void;
  setAura: (id: AuraId) => void;
  setAvatar: (uri: string | undefined, file: File | undefined) => void;
  toggleInterest: (id: InterestId) => void;
};

const initialDraft: OnboardingDraft = {
  displayName: "",
  aura: "fuego",
  avatarUri: undefined,
  avatarFile: undefined,
  avatarGradient: "fire",
  interests: [],
};

const OnboardingDraftContext = createContext<OnboardingDraftContextValue | null>(null);

export function OnboardingDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);

  const value = useMemo<OnboardingDraftContextValue>(
    () => ({
      draft,
      setDisplayName: (value) => setDraft((d) => ({ ...d, displayName: value })),
      setAura: (id) => setDraft((d) => ({ ...d, aura: id, avatarGradient: auraById(id).gradient })),
      setAvatar: (uri, file) => setDraft((d) => ({ ...d, avatarUri: uri, avatarFile: file })),
      toggleInterest: (id) =>
        setDraft((d) => {
          const has = d.interests.includes(id);
          if (has) return { ...d, interests: d.interests.filter((i) => i !== id) };
          if (d.interests.length >= 5) return d;
          return { ...d, interests: [...d.interests, id] };
        }),
    }),
    [draft]
  );

  return <OnboardingDraftContext.Provider value={value}>{children}</OnboardingDraftContext.Provider>;
}

export function useOnboardingDraft() {
  const ctx = useContext(OnboardingDraftContext);
  if (!ctx) throw new Error("useOnboardingDraft must be used within OnboardingDraftProvider");
  return ctx;
}
