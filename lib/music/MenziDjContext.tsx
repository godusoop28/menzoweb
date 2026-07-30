"use client";

import { Client } from "@stomp/stompjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { API_BASE_URL, getCachedSession, getMyRealId, mapMusicSession, mapYoutubeSearchResult, musicApi } from "@/lib/api";
import { useLiveRoomContext } from "@/lib/live/LiveRoomContext";
import type { MusicSessionSummary, YoutubeSearchResult } from "@/lib/types";

import { loadYouTubeIframeApi, YT_PLAYER_STATE, type YouTubePlayerLike } from "./youtubeIframeApi";

function wsUrl(): string {
  return API_BASE_URL.replace(/^http/, "ws") + "/ws";
}

const DRIFT_CHECK_INTERVAL_MS = 15_000;
const DRIFT_THRESHOLD_SECONDS = 2;
const AUTOPLAY_CHECK_DELAY_MS = 1500;
const DEFAULT_VOLUME = 80;

type MenziDjContextValue = {
  roomId: string | null;
  session: MusicSessionSummary | null;
  loading: boolean;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  /** Setter, no el ref crudo — exponer un RefObject directo en el valor del contexto hace que el
   * linter (react-hooks/refs) trate CUALQUIER otro campo leído del mismo objeto como "acceso a un
   * ref durante el render", así que el <div> del player se registra acá en vez de leer
   * directamente `.current` desde afuera. */
  setPlayerContainer: (el: HTMLDivElement | null) => void;
  autoplayBlocked: boolean;
  unlockAutoplay: () => void;
  localMuted: boolean;
  localVolume: number;
  toggleLocalMute: () => void;
  setLocalVolume: (value: number) => void;
  refresh: () => Promise<void>;
  searchSongs: (q: string) => Promise<YoutubeSearchResult[]>;
  addToQueue: (videoId: string, playNow?: boolean) => Promise<void>;
  requestSong: (videoId: string) => Promise<void>;
  approveRequest: (id: string) => Promise<void>;
  rejectRequest: (id: string) => Promise<void>;
  play: () => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  skip: () => Promise<void>;
  stopMusic: () => Promise<void>;
  setAllowRequests: (value: boolean) => Promise<void>;
  reorderQueue: (ids: string[]) => Promise<void>;
  removeQueueItem: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
};

const MenziDjContext = createContext<MenziDjContextValue | null>(null);

/** Menzi DJ no transmite audio por Agora — el reproductor oficial de YouTube corre en cada
 * dispositivo, sincronizado contra el estado canónico que guarda menzoapi. El player es UN SOLO
 * <div> montado acá, en el provider (nunca en una pantalla específica), así que sobrevive a
 * cambiar de pantalla o minimizar el LIVE igual que el engine de Agora en LiveRoomContext —
 * "expanded" solo cambia su tamaño/posición por CSS, nunca lo destruye ni crea uno nuevo.
 *
 * El ciclo de vida de la música está atado al de la voz (`live.activeRoomId`): si estás
 * conectado al audio del LIVE, Menzi DJ carga/sincroniza; si salís del LIVE, se limpia. No hay
 * un "watchRoom" independiente para música — no tiene sentido escuchar música de un LIVE al que
 * no estás conectado. */
export function MenziDjProvider({ children }: { children: React.ReactNode }) {
  const live = useLiveRoomContext();
  const [session, setSession] = useState<MusicSessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [localMuted, setLocalMuted] = useState(false);
  const [localVolume, setLocalVolumeState] = useState(DEFAULT_VOLUME);

  const roomIdRef = useRef<string | null>(null);
  // sessionRef espeja el estado `session` para leerlo dentro de callbacks/intervals sin
  // depender de un closure que puede quedar viejo (mismo problema que mutedRef en
  // LiveRoomContext) — cualquier función acá abajo que necesite "la sesión actual" lee de
  // sessionRef, nunca de la variable `session` capturada en su propio render.
  const sessionRef = useRef<MusicSessionSummary | null>(null);
  // Momento (reloj local) en el que se recibió el `session` actual — session.positionSeconds es
  // la posición que calculó el backend en ESE instante, no un valor que siga avanzando solo (ver
  // driftIntervalRef más abajo: compararlo tal cual contra player.getCurrentTime() varios segundos
  // después es lo que hacía que la canción se reiniciara sola).
  const sessionSnapshotAtRef = useRef<number>(0);
  const playerRef = useRef<YouTubePlayerLike | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const loadedVideoIdRef = useRef<string | null>(null);
  const creatingPlayerRef = useRef<Promise<YouTubePlayerLike> | null>(null);
  const stompRef = useRef<Client | null>(null);
  const driftIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localMutedRef = useRef(false);
  const localVolumeRef = useRef(DEFAULT_VOLUME);

  useEffect(() => {
    roomIdRef.current = live.activeRoomId;
  }, [live.activeRoomId]);
  useEffect(() => {
    sessionRef.current = session;
    sessionSnapshotAtRef.current = Date.now();
  }, [session]);
  useEffect(() => {
    localMutedRef.current = localMuted;
  }, [localMuted]);
  useEffect(() => {
    localVolumeRef.current = localVolume;
  }, [localVolume]);

  const setPlayerContainer = useCallback((el: HTMLDivElement | null) => {
    playerContainerRef.current = el;
  }, []);

  const destroyPlayer = useCallback(() => {
    playerRef.current?.destroy();
    playerRef.current = null;
    loadedVideoIdRef.current = null;
    creatingPlayerRef.current = null;
    setAutoplayBlocked(false);
  }, []);

  const applyLocalAudioState = useCallback((player: YouTubePlayerLike) => {
    if (localMutedRef.current) {
      player.mute();
    } else {
      player.unMute();
      player.setVolume(localVolumeRef.current);
    }
  }, []);

  const ensurePlayer = useCallback(
    async (videoId: string): Promise<YouTubePlayerLike | null> => {
      if (playerRef.current) {
        if (loadedVideoIdRef.current !== videoId) {
          loadedVideoIdRef.current = videoId;
          playerRef.current.loadVideoById(videoId);
        }
        return playerRef.current;
      }
      if (creatingPlayerRef.current) {
        return creatingPlayerRef.current;
      }
      const container = playerContainerRef.current;
      if (!container) return null;

      const promise = loadYouTubeIframeApi().then(
        (YT) =>
          new Promise<YouTubePlayerLike>((resolve) => {
            const player = new YT.Player(container, {
              videoId,
              width: "100%",
              height: "100%",
              playerVars: { autoplay: 1, mute: 1, playsinline: 1, controls: 0, modestbranding: 1, rel: 0 },
              events: {
                onReady: () => {
                  loadedVideoIdRef.current = videoId;
                  resolve(player);
                },
                onStateChange: (event) => {
                  if (event.data === YT_PLAYER_STATE.ENDED) {
                    // El auto-advance real lo decide el backend (ver MusicAutoAdvanceScheduler) —
                    // esto es solo para no dejar el frame congelado en el último cuadro mientras
                    // llega el próximo evento LIVE_MUSIC_TRACK_CHANGED.
                  }
                },
              },
            });
          })
      );
      creatingPlayerRef.current = promise;
      const player = await promise;
      playerRef.current = player;
      return player;
    },
    []
  );

  /** Aplica el snapshot al player: carga el video si cambió, ajusta play/pause y corrige
   * posición. Nunca confía en el reloj local para calcular la posición — `positionSeconds` ya
   * viene calculado por el backend (ver sección 10 del pedido). */
  const syncPlayerToSession = useCallback(
    async (next: MusicSessionSummary | null) => {
      if (!next || !next.currentVideoId) {
        playerRef.current?.pauseVideo();
        return;
      }
      const player = await ensurePlayer(next.currentVideoId);
      if (!player) return;

      applyLocalAudioState(player);

      if (next.status === "playing") {
        player.seekTo(next.positionSeconds, true);
        player.playVideo();
        window.setTimeout(() => {
          if (playerRef.current && playerRef.current.getPlayerState() !== YT_PLAYER_STATE.PLAYING) {
            setAutoplayBlocked(true);
          }
        }, AUTOPLAY_CHECK_DELAY_MS);
      } else if (next.status === "paused") {
        player.seekTo(next.positionSeconds, true);
        player.pauseVideo();
      } else {
        player.pauseVideo();
      }
    },
    [ensurePlayer, applyLocalAudioState]
  );

  const refresh = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    setLoading(true);
    try {
      const dto = await musicApi.snapshot(roomId);
      const mapped = mapMusicSession(dto, getMyRealId());
      setSession(mapped);
      await syncPlayerToSession(mapped);
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [syncPlayerToSession]);

  const unlockAutoplay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    applyLocalAudioState(player);
    player.playVideo();
    setAutoplayBlocked(false);
  }, [applyLocalAudioState]);

  const toggleLocalMute = useCallback(() => {
    setLocalMuted((prev) => {
      const next = !prev;
      if (playerRef.current) {
        if (next) playerRef.current.mute();
        else {
          playerRef.current.unMute();
          playerRef.current.setVolume(localVolumeRef.current);
        }
      }
      return next;
    });
  }, []);

  const setLocalVolume = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    setLocalVolumeState(clamped);
    if (playerRef.current && !localMutedRef.current) {
      playerRef.current.setVolume(clamped);
    }
  }, []);

  // ---- ciclo de vida: atado a estar conectado al audio del LIVE (live.activeRoomId) -----------
  useEffect(() => {
    const roomId = live.activeRoomId;
    if (!roomId) {
      // Nada que preparar — si veníamos de una sala real, la función de limpieza de ESE run del
      // efecto (más abajo) ya se encargó de destruir el player y limpiar el estado antes de que
      // este run (con roomId=null) siquiera empiece.
      return;
    }

    refresh();

    const cachedSession = getCachedSession();
    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: cachedSession ? { Authorization: `Bearer ${cachedSession.accessToken}` } : {},
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(`/topic/rooms/${roomId}/music`, () => {
          // Cualquier evento LIVE_MUSIC_* — se vuelve a pedir el snapshot completo en vez de
          // intentar mergear el payload a mano; es más simple y a prueba de eventos perdidos u
          // orden inconsistente, y esta ruta ya es liviana.
          refresh();
        });
      },
    });
    client.activate();
    stompRef.current = client;

    driftIntervalRef.current = setInterval(() => {
      const player = playerRef.current;
      const current = sessionRef.current;
      if (!player || !current || current.status !== "playing") return;
      // current.positionSeconds quedó fijo en el momento en que llegó este snapshot — hay que
      // sumarle el tiempo real transcurrido desde entonces para saber dónde debería estar la
      // canción AHORA, si no, cada tick de este intervalo comparaba contra un valor cada vez más
      // viejo y terminaba "corrigiendo" hacia atrás una posición que en realidad nunca se atrasó.
      const expectedPosition = current.positionSeconds + (Date.now() - sessionSnapshotAtRef.current) / 1000;
      const localTime = player.getCurrentTime();
      const drift = Math.abs(localTime - expectedPosition);
      if (drift > DRIFT_THRESHOLD_SECONDS) {
        player.seekTo(expectedPosition, true);
      }
    }, DRIFT_CHECK_INTERVAL_MS);

    return () => {
      client.deactivate();
      stompRef.current = null;
      if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
      driftIntervalRef.current = null;
      destroyPlayer();
      setSession(null);
      setExpanded(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh/destroyPlayer son estables (useCallback con deps propias); solo debe re-correr cuando cambia la sala de voz activa
  }, [live.activeRoomId]);

  const searchSongs = useCallback(async (q: string): Promise<YoutubeSearchResult[]> => {
    const roomId = roomIdRef.current;
    if (!roomId) return [];
    const dtos = await musicApi.search(roomId, q);
    return dtos.map(mapYoutubeSearchResult);
  }, []);

  function currentVersion(): number | undefined {
    return sessionRef.current?.version;
  }

  const addToQueue = useCallback(
    async (videoId: string, playNow?: boolean) => {
      const roomId = roomIdRef.current;
      if (!roomId) return;
      const dto = await musicApi.addToQueue(roomId, { videoId, expectedVersion: currentVersion(), playNow });
      const mapped = mapMusicSession(dto, getMyRealId());
      setSession(mapped);
      await syncPlayerToSession(mapped);
    },
    [syncPlayerToSession]
  );

  const requestSong = useCallback(async (videoId: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    await musicApi.requestSong(roomId, { videoId });
    await refresh();
  }, [refresh]);

  const approveRequest = useCallback(async (id: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    await musicApi.approveRequest(roomId, id);
    await refresh();
  }, [refresh]);

  const rejectRequest = useCallback(async (id: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    await musicApi.rejectRequest(roomId, id);
    await refresh();
  }, [refresh]);

  const applyControl = useCallback(
    async (action: (roomId: string, body: { expectedVersion?: number }) => Promise<import("@/lib/api").MusicSessionDto>) => {
      const roomId = roomIdRef.current;
      if (!roomId) return;
      const dto = await action(roomId, { expectedVersion: currentVersion() });
      const mapped = mapMusicSession(dto, getMyRealId());
      setSession(mapped);
      await syncPlayerToSession(mapped);
    },
    [syncPlayerToSession]
  );

  const play = useCallback(() => applyControl(musicApi.play), [applyControl]);
  const pauseTrack = useCallback(() => applyControl(musicApi.pause), [applyControl]);
  const resumeTrack = useCallback(() => applyControl(musicApi.resume), [applyControl]);
  const skip = useCallback(() => applyControl(musicApi.skip), [applyControl]);
  const stopMusic = useCallback(() => applyControl(musicApi.stop), [applyControl]);

  const seek = useCallback(
    async (seconds: number) => {
      const roomId = roomIdRef.current;
      if (!roomId) return;
      const dto = await musicApi.seek(roomId, { positionSeconds: Math.round(seconds), expectedVersion: currentVersion() });
      const mapped = mapMusicSession(dto, getMyRealId());
      setSession(mapped);
      await syncPlayerToSession(mapped);
    },
    [syncPlayerToSession]
  );

  const setAllowRequests = useCallback(async (value: boolean) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const dto = await musicApi.updateSettings(roomId, { allowRequests: value });
    setSession(mapMusicSession(dto, getMyRealId()));
  }, []);

  const reorderQueue = useCallback(async (ids: string[]) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const dto = await musicApi.reorderQueue(roomId, { orderedQueueItemIds: ids, expectedVersion: currentVersion() });
    setSession(mapMusicSession(dto, getMyRealId()));
  }, []);

  const removeQueueItem = useCallback(async (id: string) => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    await musicApi.removeQueueItem(roomId, id);
    await refresh();
  }, [refresh]);

  const clearQueue = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    await musicApi.clearQueue(roomId);
    await refresh();
  }, [refresh]);

  const value = useMemo<MenziDjContextValue>(
    () => ({
      roomId: live.activeRoomId,
      session,
      loading,
      expanded,
      setExpanded,
      setPlayerContainer,
      autoplayBlocked,
      unlockAutoplay,
      localMuted,
      localVolume,
      toggleLocalMute,
      setLocalVolume,
      refresh,
      searchSongs,
      addToQueue,
      requestSong,
      approveRequest,
      rejectRequest,
      play,
      pauseTrack,
      resumeTrack,
      seek,
      skip,
      stopMusic,
      setAllowRequests,
      reorderQueue,
      removeQueueItem,
      clearQueue,
    }),
    [
      live.activeRoomId,
      session,
      loading,
      expanded,
      setPlayerContainer,
      autoplayBlocked,
      unlockAutoplay,
      localMuted,
      localVolume,
      toggleLocalMute,
      setLocalVolume,
      refresh,
      searchSongs,
      addToQueue,
      requestSong,
      approveRequest,
      rejectRequest,
      play,
      pauseTrack,
      resumeTrack,
      seek,
      skip,
      stopMusic,
      setAllowRequests,
      reorderQueue,
      removeQueueItem,
      clearQueue,
    ]
  );

  return <MenziDjContext.Provider value={value}>{children}</MenziDjContext.Provider>;
}

export function useMenziDjContext() {
  const ctx = useContext(MenziDjContext);
  if (!ctx) throw new Error("useMenziDjContext must be used within a MenziDjProvider");
  return ctx;
}
