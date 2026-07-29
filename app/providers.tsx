"use client";

import { AccentProvider } from "@/lib/AccentContext";
import { AppStateProvider } from "@/lib/AppStateContext";
import { ToastProvider } from "@/lib/ToastContext";
import { VoiceRoomProvider } from "@/lib/voice/VoiceRoomContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppStateProvider>
        <AccentProvider>
          <VoiceRoomProvider>{children}</VoiceRoomProvider>
        </AccentProvider>
      </AppStateProvider>
    </ToastProvider>
  );
}
