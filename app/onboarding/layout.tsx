"use client";

import { usePathname } from "next/navigation";

import { ScreenBackground } from "@/components/ScreenBackground";
import { OnboardingDraftProvider } from "@/lib/OnboardingDraftContext";

const STEPS = ["name", "aura", "avatar", "interests", "confirm"];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const stepIndex = STEPS.findIndex((s) => pathname.endsWith(s));

  return (
    <OnboardingDraftProvider>
      <ScreenBackground src="/backgrounds/background-onboarding.png" overlay={0.66}>
        <div className="mx-auto min-h-screen w-full max-w-lg px-6 py-8">
          {stepIndex >= 0 && (
            <div className="mb-6 flex gap-1.5">
              {STEPS.map((step, i) => (
                <div
                  key={step}
                  className="h-1 flex-1 rounded-full transition-colors"
                  style={{ background: i <= stepIndex ? "var(--color-orange)" : "var(--color-surface-soft)" }}
                />
              ))}
            </div>
          )}
          <div className="menzo-fade-in">{children}</div>
        </div>
      </ScreenBackground>
    </OnboardingDraftProvider>
  );
}
