"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { AppShell } from "@/components/AppShell";
import { useAppState } from "@/lib/AppStateContext";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const { state } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (!state.isHydrated) return;
    if (!state.profile) {
      router.replace("/login");
      return;
    }
    if (!state.onboardingCompleted) {
      router.replace("/onboarding/name");
    }
  }, [state.isHydrated, state.profile, state.onboardingCompleted, router]);

  if (!state.isHydrated || !state.profile || !state.onboardingCompleted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="relative flex items-center justify-center">
          <div
            className="absolute h-28 w-28 animate-pulse rounded-full blur-2xl"
            style={{ background: "radial-gradient(circle, rgba(255,122,26,0.4), rgba(139,92,246,0.15), transparent 70%)" }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/menzo-logo.png" alt="Menzo" className="relative h-16 w-16 rounded-2xl shadow-xl" />
        </div>
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-[var(--color-orange)]" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
