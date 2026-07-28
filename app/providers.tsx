"use client";

import { AccentProvider } from "@/lib/AccentContext";
import { AppStateProvider } from "@/lib/AppStateContext";
import { ToastProvider } from "@/lib/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppStateProvider>
        <AccentProvider>{children}</AccentProvider>
      </AppStateProvider>
    </ToastProvider>
  );
}
