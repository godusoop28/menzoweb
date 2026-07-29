"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { IAgoraRTCClient, IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

import { getMyRealId, mapUserSummary, voiceApi } from "@/lib/api";
import type { DemoUser } from "@/lib/types";

/** Nivel de Agora (0-100) normalizado a 0-1 para que la UI no tenga que conocer la escala del SDK. */
function normalizeLevel(level: number): number {
  return Math.max(0, Math.min(1, level / 100));
}

type VoiceRoomContextValue = {
  activeRoomId: string | null;
  connected: boolean;
  connecting: boolean;
  muted: boolean;
  participants: DemoUser[];
  speakingLevels: Map<string, number>;
  join: (roomId: string) => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => Promise<void>;
};

const VoiceRoomContext = createContext<VoiceRoomContextValue | null>(null);

/** Antes esto era un hook (`useVoiceRoom(roomId)`) instanciado directamente en la pantalla de
 * chat — el cliente de Agora vivía y moría con ese componente, así que navegar a otra pantalla
 * cortaba la voz aunque la sala siguiera en vivo. Ahora es un Provider montado una sola vez en
 * app/providers.tsx, por encima del router — la conexión sobrevive a cualquier navegación, y
 * quien quiera unirse/salir/ver el estado llama a useVoiceRoomContext() desde donde sea. */
export function VoiceRoomProvider({ children }: { children: React.ReactNode }) {
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<DemoUser[]>([]);
  const [speakingLevels, setSpeakingLevels] = useState<Map<string, number>>(new Map());
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const trackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const activeRoomIdRef = useRef<string | null>(null);

  const refreshParticipants = useCallback(async (roomId: string) => {
    try {
      const dto = await voiceApi.participants(roomId);
      const myRealId = getMyRealId();
      setParticipants(dto.participants.map((p) => mapUserSummary(p, myRealId)));
    } catch (error) {
      console.warn("[menzo/voice] participants failed", error);
    }
  }, []);

  useEffect(() => {
    if (!activeRoomId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-then-poll on room change, same pattern used elsewhere in this app
    refreshParticipants(activeRoomId);
    const interval = setInterval(() => refreshParticipants(activeRoomId), 5000);
    return () => clearInterval(interval);
  }, [activeRoomId, refreshParticipants]);

  const cleanupClient = useCallback(async () => {
    trackRef.current?.close();
    trackRef.current = null;
    const client = clientRef.current;
    if (client) {
      clientRef.current = null;
      client.removeAllListeners();
      await client.leave().catch(() => {});
    }
    setConnected(false);
    setSpeakingLevels(new Map());
  }, []);

  const join = useCallback(
    async (roomId: string) => {
      if (connecting || (connected && activeRoomIdRef.current === roomId)) return;
      // Si ya estaba en otra sala, salir de esa primero — solo se puede estar en un live a la vez.
      if (clientRef.current) {
        await cleanupClient();
      }
      activeRoomIdRef.current = roomId;
      setActiveRoomId(roomId);
      setConnecting(true);
      try {
        // Import dinámico: agora-rtc-sdk-ng toca `window` al evaluarse, así que un import estático
        // acá rompía el prerender estático de páginas que ni siquiera usan voz (este provider
        // envuelve toda la app desde providers.tsx) — Next.js necesita poder evaluar este módulo
        // en el servidor durante el build, y solo se carga de verdad cuando alguien se une a un live.
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        const { appId, channelName, token, uid } = await voiceApi.getToken(roomId);
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.enableAudioVolumeIndicator();
        client.on("volume-indicator", (volumes) => {
          const levels = new Map<string, number>();
          for (const v of volumes) {
            levels.set(String(v.uid), normalizeLevel(v.level));
          }
          setSpeakingLevels(levels);
        });
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "audio") user.audioTrack?.play();
        });

        await client.join(appId, channelName, token, uid);
        const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
        trackRef.current = micTrack;
        await client.publish([micTrack]);

        await voiceApi.join(roomId);
        setConnected(true);
        setMuted(false);
        refreshParticipants(roomId);
      } catch (error) {
        console.warn("[menzo/voice] join failed", error);
        await cleanupClient();
        activeRoomIdRef.current = null;
        setActiveRoomId(null);
      } finally {
        setConnecting(false);
      }
    },
    [connecting, connected, cleanupClient, refreshParticipants]
  );

  const leave = useCallback(async () => {
    const roomId = activeRoomIdRef.current;
    await cleanupClient();
    activeRoomIdRef.current = null;
    setActiveRoomId(null);
    if (roomId) {
      await voiceApi.leave(roomId).catch(() => {});
    }
  }, [cleanupClient]);

  const toggleMute = useCallback(async () => {
    if (!trackRef.current) return;
    const next = !muted;
    await trackRef.current.setEnabled(!next);
    setMuted(next);
  }, [muted]);

  // Intento de salir de la voz al cerrar la pestaña/recargar — no al navegar entre rutas de la
  // app, ya que este provider ahora vive por encima del router y sobrevive a eso a propósito.
  // No es 100% confiable (el navegador puede cortar el fetch antes de que salga), por eso el
  // heartbeat de 30s en el backend es la red de seguridad real, no este intento.
  useEffect(() => {
    function handleBeforeUnload() {
      const roomId = activeRoomIdRef.current;
      if (roomId) {
        voiceApi.leave(roomId).catch(() => {});
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return (
    <VoiceRoomContext.Provider
      value={{ activeRoomId, connected, connecting, muted, participants, speakingLevels, join, leave, toggleMute }}
    >
      {children}
    </VoiceRoomContext.Provider>
  );
}

export function useVoiceRoomContext() {
  const ctx = useContext(VoiceRoomContext);
  if (!ctx) throw new Error("useVoiceRoomContext must be used within a VoiceRoomProvider");
  return ctx;
}
