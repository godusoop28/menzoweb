"use client";

import { AccentProvider } from "@/lib/AccentContext";
import { AppStateProvider } from "@/lib/AppStateContext";
import { LiveRoomProvider } from "@/lib/live/LiveRoomContext";
import { MenziDjProvider } from "@/lib/music/MenziDjContext";
import { ToastProvider } from "@/lib/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppStateProvider>
        <AccentProvider>
          <LiveRoomProvider>
            {/* Depende de LiveRoomProvider (la música vive mientras dure la conexión de voz al
                LIVE) — tiene que montarse debajo, nunca al revés. */}
            <MenziDjProvider>{children}</MenziDjProvider>
          </LiveRoomProvider>
        </AccentProvider>
      </AppStateProvider>
    </ToastProvider>
  );
}
