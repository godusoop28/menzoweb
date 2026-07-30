"use client";

import { AccentProvider } from "@/lib/AccentContext";
import { AppStateProvider } from "@/lib/AppStateContext";
import { LiveRoomProvider } from "@/lib/live/LiveRoomContext";
import { ToastProvider } from "@/lib/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppStateProvider>
        <AccentProvider>
          <LiveRoomProvider>{children}</LiveRoomProvider>
        </AccentProvider>
      </AppStateProvider>
    </ToastProvider>
  );
}
