"use client";

import { createContext, useContext, useMemo, useState } from "react";

import type { GradientId } from "@/lib/theme";
import type { InterestId } from "@/lib/types";

type OnboardingDraft = {
  displayName: string;
  username: string;
  avatarUri?: string;
  avatarFile?: File;
  avatarGradient: GradientId;
  interests: InterestId[];
  /** Al menos una es obligatoria para completar el onboarding (ver
   * OnboardingRequest.communityIds en menzoapi). */
  communityIds: string[];
};

type OnboardingDraftContextValue = {
  draft: OnboardingDraft;
  setDisplayName: (value: string) => void;
  setUsername: (value: string) => void;
  setAvatar: (uri: string | undefined, file: File | undefined) => void;
  toggleInterest: (id: InterestId) => void;
  toggleCommunity: (id: string) => void;
};

const initialDraft: OnboardingDraft = {
  displayName: "",
  username: "",
  avatarUri: undefined,
  avatarFile: undefined,
  avatarGradient: "fire",
  interests: [],
  communityIds: [],
};

const OnboardingDraftContext = createContext<OnboardingDraftContextValue | null>(null);

export function OnboardingDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<OnboardingDraft>(initialDraft);

  const value = useMemo<OnboardingDraftContextValue>(
    () => ({
      draft,
      setDisplayName: (value) => setDraft((d) => ({ ...d, displayName: value })),
      setUsername: (value) => setDraft((d) => ({ ...d, username: value })),
      setAvatar: (uri, file) => setDraft((d) => ({ ...d, avatarUri: uri, avatarFile: file })),
      toggleInterest: (id) =>
        setDraft((d) => {
          const has = d.interests.includes(id);
          if (has) return { ...d, interests: d.interests.filter((i) => i !== id) };
          if (d.interests.length >= 5) return d;
          return { ...d, interests: [...d.interests, id] };
        }),
      toggleCommunity: (id) =>
        setDraft((d) => {
          const has = d.communityIds.includes(id);
          return { ...d, communityIds: has ? d.communityIds.filter((c) => c !== id) : [...d.communityIds, id] };
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
