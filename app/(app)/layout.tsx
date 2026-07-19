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
      <div className="flex min-h-screen items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-border-strong)] border-t-transparent" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
