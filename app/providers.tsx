"use client";

import { SlowRequestBanner } from "@/components/SlowRequestBanner";
import { AccentProvider } from "@/lib/AccentContext";
import { AccessibilityPrefsProvider } from "@/lib/AccessibilityPrefsContext";
import { AppStateProvider } from "@/lib/AppStateContext";
import { CommunityProvider } from "@/lib/communities/CommunityContext";
import { LiveRoomProvider } from "@/lib/live/LiveRoomContext";
import { MenziDjProvider } from "@/lib/music/MenziDjContext";
import { ToastProvider } from "@/lib/ToastContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Por-dispositivo, sin dependencias de sesión/comunidad — se monta primero para que login/
    // onboarding también puedan leerla más adelante si hace falta.
    <AccessibilityPrefsProvider>
      <ToastProvider>
        <SlowRequestBanner />
        <AppStateProvider>
          {/* Depende de AppStateProvider (necesita el perfil para saber si hay sesión) pero es
              independiente de todo lo demás — cambiar de comunidad nunca debe tocar accent/LIVE/DJ. */}
          <CommunityProvider>
            <AccentProvider>
              <LiveRoomProvider>
                {/* Depende de LiveRoomProvider (la música vive mientras dure la conexión de voz al
                    LIVE) — tiene que montarse debajo, nunca al revés. */}
                <MenziDjProvider>{children}</MenziDjProvider>
              </LiveRoomProvider>
            </AccentProvider>
          </CommunityProvider>
        </AppStateProvider>
      </ToastProvider>
    </AccessibilityPrefsProvider>
  );
}
