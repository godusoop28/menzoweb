"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AgoraRTC, { type IAgoraRTCClient, type IMicrophoneAudioTrack } from "agora-rtc-sdk-ng";

import { getMyRealId, mapUserSummary, voiceApi } from "@/lib/api";
import type { DemoUser } from "@/lib/types";

const SPEAKING_VOLUME_THRESHOLD = 5;

export function useVoiceRoom(roomId: string | undefined) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState<DemoUser[]>([]);
  const [speakingUserIds, setSpeakingUserIds] = useState<Set<string>>(new Set());
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const trackRef = useRef<IMicrophoneAudioTrack | null>(null);

  const refreshParticipants = useCallback(async () => {
    if (!roomId) return;
    try {
      const dto = await voiceApi.participants(roomId);
      const myRealId = getMyRealId();
      setParticipants(dto.participants.map((p) => mapUserSummary(p, myRealId)));
    } catch (error) {
      console.warn("[menzo/voice] participants failed", error);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-then-poll on mount, same pattern used for room messages elsewhere in this app
    refreshParticipants();
    const interval = setInterval(refreshParticipants, 5000);
    return () => clearInterval(interval);
  }, [roomId, refreshParticipants]);

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
    setSpeakingUserIds(new Set());
  }, []);

  const join = useCallback(async () => {
    if (!roomId || connecting || connected) return;
    setConnecting(true);
    try {
      const { appId, channelName, token, uid } = await voiceApi.getToken(roomId);
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.enableAudioVolumeIndicator();
      client.on("volume-indicator", (volumes) => {
        const speaking = new Set<string>();
        for (const v of volumes) {
          if (v.level > SPEAKING_VOLUME_THRESHOLD) speaking.add(String(v.uid));
        }
        setSpeakingUserIds(speaking);
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
      refreshParticipants();
    } catch (error) {
      console.warn("[menzo/voice] join failed", error);
      await cleanupClient();
    } finally {
      setConnecting(false);
    }
  }, [roomId, connecting, connected, refreshParticipants, cleanupClient]);

  const leave = useCallback(async () => {
    await cleanupClient();
    if (roomId) {
      await voiceApi.leave(roomId).catch(() => {});
      refreshParticipants();
    }
  }, [cleanupClient, roomId, refreshParticipants]);

  const toggleMute = useCallback(async () => {
    if (!trackRef.current) return;
    const next = !muted;
    await trackRef.current.setEnabled(!next);
    setMuted(next);
  }, [muted]);

  // Salir de la voz si el usuario navega fuera de la sala sin tocar "Salir".
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        cleanupClient();
        if (roomId) voiceApi.leave(roomId).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  return { connected, connecting, muted, participants, speakingUserIds, join, leave, toggleMute };
}
