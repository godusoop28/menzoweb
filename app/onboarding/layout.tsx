"use client";

import { OnboardingDraftProvider } from "@/lib/OnboardingDraftContext";

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingDraftProvider>
      <div className="mx-auto min-h-screen w-full max-w-lg px-6 py-10">{children}</div>
    </OnboardingDraftProvider>
  );
}
