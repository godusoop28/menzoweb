"use client";

import { AppStateProvider } from "@/lib/AppStateContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AppStateProvider>{children}</AppStateProvider>;
}
