"use client";

import { Client } from "@stomp/stompjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { IAgoraRTCClient, IMicrophoneAudioTrack, IRemoteAudioTrack } from "agora-rtc-sdk-ng";

import { API_BASE_URL, getCachedSession, getMyRealId, liveApi, mapLiveParticipant, mapLiveSession } from "@/lib/api";
import type { LiveEventDto, LiveParticipantDto } from "@/lib/api/types";
import type { LiveParticipant, LiveParticipantRole, LiveSessionSummary } from "@/lib/types";

/** Nivel de Agora (0-100) normalizado a 0-1 para que la UI no tenga que conocer la escala del SDK. */
function normalizeLevel(level: number): number {
  return Math.max(0, Math.min(1, level / 100));
}

function wsUrl(): string {
  return API_BASE_URL.replace(/^http/, "ws") + "/ws";
}

const SPEAKING_ROLES: LiveParticipantRole[] = ["host", "co_host", "speaker"];

type LiveRoomContextValue = {
  // Estado del LIVE de la sala que se está mirando ahora mismo (cabecera del chat) — no implica
  // estar conectado al audio.
  watchedRoomId: string | null;
  viewingState: LiveSessionSummary | null;
  watchRoom: (roomId: string) => void;
  unwatchRoom: (roomId: string) => void;

  // Conexión de audio real — sobrevive a la navegación (ver comentario en el provider).
  activeRoomId: string | null;
  connected: boolean;
  connecting: boolean;
  myRole: LiveParticipantRole | null;
  muted: boolean;
  // Fuente única del estado del micrófono (ver sección 17 del pedido) — el botón de mic en
  // cualquier componente debe leer estos campos, nunca mantener su propia copia del estado.
  microphoneChanging: boolean;
  microphonePermission: "unknown" | "granted" | "denied";
  localAudioPublished: boolean;
  lastMicrophoneError: string | null;
  canSpeak: boolean;
  participants: LiveParticipant[];
  speakingLevels: Map<string, number>;
  speakingRequests: LiveParticipant[];
  autoplayBlocked: boolean;
  unlockAudio: () => void;

  join: (roomId: string) => Promise<void>;
  leave: () => Promise<void>;
  toggleMute: () => Promise<void>;
  startLive: (roomId: string, info?: { title?: string; description?: string; announcement?: string }) => Promise<void>;
  endLive: (roomId: string) => Promise<void>;
  updateLiveInfo: (roomId: string, info: { title?: string; description?: string; announcement?: string }) => Promise<void>;
  requestToSpeak: () => Promise<void>;
  cancelSpeakRequest: () => Promise<void>;
  approveSpeaking: (userId: string) => Promise<void>;
  rejectSpeaking: (userId: string) => Promise<void>;
  demoteParticipant: (userId: string) => Promise<void>;
  muteParticipant: (userId: string) => Promise<void>;
  removeParticipant: (userId: string) => Promise<void>;
  refreshParticipants: () => Promise<void>;
};

const LiveRoomContext = createContext<LiveRoomContextValue | null>(null);

/** Provider global (montado una sola vez en app/providers.tsx, por encima del router) — igual que
 * el VoiceRoomContext que reemplaza: la conexión de Agora sobrevive a cualquier navegación, así
 * que minimizar el LIVE y seguir viendo otras pantallas no corta el audio (ver sección 26 del
 * pedido). Reemplaza las llamadas a /api/chat/rooms/{id}/voice/* (sin roles, "todos publisher")
 * por /api/chat/rooms/{id}/live/* (con roles HOST/CO_HOST/SPEAKER/AUDIENCE/REQUESTED) — los
 * endpoints /voice/* siguen intactos en el backend para menzomovil, que no se toca en esta fase. */
export function LiveRoomProvider({ children }: { children: React.ReactNode }) {
  const [watchedRoomId, setWatchedRoomId] = useState<string | null>(null);
  const [viewingState, setViewingState] = useState<LiveSessionSummary | null>(null);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [myRole, setMyRole] = useState<LiveParticipantRole | null>(null);
  const [muted, setMuted] = useState(true);
  const [microphoneChanging, setMicrophoneChanging] = useState(false);
  const [microphonePermission, setMicrophonePermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [localAudioPublished, setLocalAudioPublished] = useState(false);
  const [lastMicrophoneError, setLastMicrophoneError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<LiveParticipant[]>([]);
  const [speakingLevels, setSpeakingLevels] = useState<Map<string, number>>(new Map());
  const [speakingRequests, setSpeakingRequests] = useState<LiveParticipant[]>([]);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteAudioTracksRef = useRef<Map<string, IRemoteAudioTrack>>(new Map());
  const activeRoomIdRef = useRef<string | null>(null);
  const myRoleRef = useRef<LiveParticipantRole | null>(null);
  // Refs espejo de estado leído dentro de callbacks async (toggleMute, etc.) — un closure de
  // useCallback puede quedar con un valor viejo si el usuario toca el botón dos veces seguidas
  // antes de que React re-renderice; leer del ref siempre da el valor más reciente.
  const mutedRef = useRef(true);

  const stompRef = useRef<Client | null>(null);

  useEffect(() => {
    myRoleRef.current = myRole;
  }, [myRole]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // ---- WebSocket: un cliente STOMP persistente para todo el provider, con suscripciones que se
  // agregan/quitan dinámicamente por sala (watchedRoomId y activeRoomId pueden ser salas
  // distintas: escuchar el LIVE de A minimizado mientras se navega al chat de B). ------------------
  function ensureStompClient(): Client {
    if (stompRef.current) return stompRef.current;
    const session = getCachedSession();
    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: session ? { Authorization: `Bearer ${session.accessToken}` } : {},
      reconnectDelay: 3000,
    });
    client.activate();
    stompRef.current = client;
    return client;
  }

  const subscribeLiveTopic = useCallback((roomId: string, onEvent: (event: LiveEventDto) => void) => {
    const client = ensureStompClient();
    const destination = `/topic/rooms/${roomId}/live`;
    let stompSub: { unsubscribe: () => void } | null = null;
    let cancelled = false;

    function doSubscribe() {
      if (cancelled) return;
      stompSub = client.subscribe(destination, (frame) => {
        try {
          onEvent(JSON.parse(frame.body) as LiveEventDto);
        } catch (error) {
          console.warn("[menzo/live] failed to parse live event", error);
        }
      });
    }

    if (client.connected) {
      doSubscribe();
    } else {
      const prevOnConnect = client.onConnect;
      client.onConnect = (frame) => {
        prevOnConnect?.(frame);
        doSubscribe();
      };
    }

    return () => {
      cancelled = true;
      stompSub?.unsubscribe();
    };
  }, []);

  /** Crea el track de micrófono y lo publica ya deshabilitado ("iniciar silenciado por
   * seguridad", ver sección 17/19 del pedido) — nadie queda con el micrófono caliente sin haberlo
   * activado a propósito, ni recién aprobado como SPEAKER ni al arrancar un LIVE como HOST.
   * Si falla (permiso de micrófono denegado, hardware ocupado, etc.) NO deja al llamador creer
   * que puede hablar: limpia el track, marca localAudioPublished=false y deja lastMicrophoneError
   * con un mensaje claro para que la UI pueda ofrecer "reintentar" en vez de un botón mudo. */
  const publishMicTrack = useCallback(
    async (client: IAgoraRTCClient, AgoraRTC: typeof import("agora-rtc-sdk-ng").default) => {
      try {
        const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
        await micTrack.setEnabled(false);
        micTrackRef.current = micTrack;
        await client.publish([micTrack]);
        setMicrophonePermission("granted");
        setLocalAudioPublished(true);
        setMuted(true);
        setLastMicrophoneError(null);
      } catch (error) {
        console.warn("[menzo/live] publishMicTrack failed", error);
        micTrackRef.current = null;
        setLocalAudioPublished(false);
        setMicrophonePermission("denied");
        setLastMicrophoneError("No pudimos acceder a tu micrófono. Revisá los permisos del navegador.");
      }
    },
    []
  );

  /** Aprobaron mi solicitud para hablar: necesito un token nuevo con privilegio de publisher (el
   * que tenía como audiencia era subscriber-only) y recién ahí crear+publicar el track de mic —
   * nunca antes, para no pedir permiso de micrófono mientras solo escuchaba. El rol cambia a
   * "speaker" siempre que el servidor lo confirmó, incluso si publishMicTrack falla después — la
   * persona SÍ es speaker (puede reintentar el micrófono); lo que puede fallar es solo el
   * hardware local, y localAudioPublished/lastMicrophoneError reflejan eso por separado. */
  const becomeSpeaker = useCallback(
    async (roomId: string) => {
      const client = clientRef.current;
      if (!client) return;
      try {
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        const tokenDto = await liveApi.token(roomId);
        await client.renewToken(tokenDto.token);
        setMyRole("speaker");
        await publishMicTrack(client, AgoraRTC);
      } catch (error) {
        console.warn("[menzo/live] becomeSpeaker failed", error);
        setLastMicrophoneError("No pudimos activar tu lugar como hablante. Intentá de nuevo.");
      }
    },
    [publishMicTrack]
  );

  /** Me bajaron del escenario (o me rechazaron la solicitud): dejo de publicar y vuelvo a un
   * token de solo escucha, sin cortar la conexión de audio. */
  const becomeAudience = useCallback(async () => {
    const roomId = activeRoomIdRef.current;
    const client = clientRef.current;
    if (micTrackRef.current) {
      if (client) await client.unpublish([micTrackRef.current]).catch(() => {});
      micTrackRef.current.close();
      micTrackRef.current = null;
    }
    setMuted(true);
    setLocalAudioPublished(false);
    setLastMicrophoneError(null);
    if (client && roomId) {
      try {
        const tokenDto = await liveApi.token(roomId);
        await client.renewToken(tokenDto.token);
      } catch (error) {
        console.warn("[menzo/live] renew subscriber token failed", error);
      }
    }
  }, []);

  const applyParticipantEvent = useCallback((event: LiveEventDto) => {
    const myRealId = getMyRealId();
    const payload = event.payload as LiveParticipantDto | null;
    const participant = payload ? mapLiveParticipant(payload, myRealId) : null;

    if (event.type === "CHAT_LIVE_ENDED") {
      setParticipants([]);
      setSpeakingRequests([]);
      setViewingState((prev) => (prev ? { ...prev, status: "ended" } : prev));
      return;
    }

    if (!participant) return;
    const isMe = participant.user.id === myRealId;

    setParticipants((prev) => {
      const withoutTarget = prev.filter((p) => p.user.id !== participant.user.id);
      if (event.type === "CHAT_LIVE_PARTICIPANT_LEFT") return withoutTarget;
      return [...withoutTarget, participant].sort((a, b) => roleOrder(a.role) - roleOrder(b.role));
    });

    if (event.type === "CHAT_LIVE_SPEAKING_REQUESTED") {
      setSpeakingRequests((prev) => [...prev.filter((p) => p.user.id !== participant.user.id), participant]);
    } else if (event.type === "CHAT_LIVE_SPEAKING_APPROVED" || event.type === "CHAT_LIVE_SPEAKING_REJECTED") {
      setSpeakingRequests((prev) => prev.filter((p) => p.user.id !== participant.user.id));
    }

    if (isMe && activeRoomIdRef.current === event.roomId) {
      if (event.type === "CHAT_LIVE_SPEAKING_APPROVED") {
        becomeSpeaker(event.roomId);
      } else if (event.type === "CHAT_LIVE_PARTICIPANT_DEMOTED" || event.type === "CHAT_LIVE_SPEAKING_REJECTED") {
        becomeAudience();
        setMyRole(participant.role);
      } else if (event.type === "CHAT_LIVE_MICROPHONE_CHANGED" && !participant.microphoneEnabled) {
        micTrackRef.current?.setEnabled(false).catch(() => {});
        setMuted(true);
      }
    }
  }, [becomeSpeaker, becomeAudience]);

  // Watch: solo lectura del estado del LIVE para mostrarlo en la cabecera/anuncio — no une audio.
  const watchRoom = useCallback(
    (roomId: string) => {
      setWatchedRoomId(roomId);
      liveApi
        .state(roomId)
        .then((dto) => setViewingState(dto ? mapLiveSession(dto) : null))
        .catch(() => setViewingState(null));

      const unsubscribe = subscribeLiveTopic(roomId, (event) => {
        if (event.type === "CHAT_LIVE_STARTED" || event.type === "CHAT_LIVE_UPDATED") {
          liveApi
            .state(roomId)
            .then((dto) => setViewingState(dto ? mapLiveSession(dto) : null))
            .catch(() => {});
        } else if (event.type === "CHAT_LIVE_ENDED") {
          setViewingState((prev) => (prev ? { ...prev, status: "ended" } : prev));
        } else if (event.type.startsWith("CHAT_LIVE_PARTICIPANT") || event.type.startsWith("CHAT_LIVE_SPEAKING")) {
          setViewingState((prev) =>
            prev
              ? {
                  ...prev,
                  participantCount:
                    typeof (event.payload as { participantCount?: number })?.participantCount === "number"
                      ? (event.payload as { participantCount: number }).participantCount
                      : prev.participantCount,
                }
              : prev
          );
        }
      });

      return unsubscribe;
    },
    [subscribeLiveTopic]
  );

  const watchUnsubRef = useRef<(() => void) | null>(null);
  const watchRoomWithCleanup = useCallback(
    (roomId: string) => {
      watchUnsubRef.current?.();
      watchUnsubRef.current = watchRoom(roomId);
    },
    [watchRoom]
  );

  const unwatchRoom = useCallback((roomId: string) => {
    if (watchedRoomId !== roomId) return;
    watchUnsubRef.current?.();
    watchUnsubRef.current = null;
    setWatchedRoomId(null);
    setViewingState(null);
  }, [watchedRoomId]);

  const refreshParticipants = useCallback(async () => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    try {
      const dtos = await liveApi.participants(roomId);
      const myRealId = getMyRealId();
      const mapped = dtos.map((dto) => mapLiveParticipant(dto, myRealId)).filter((p): p is LiveParticipant => !!p);
      setParticipants(mapped.sort((a, b) => roleOrder(a.role) - roleOrder(b.role)));
    } catch (error) {
      console.warn("[menzo/live] participants failed", error);
    }
  }, []);

  const cleanupAgoraClient = useCallback(async () => {
    micTrackRef.current?.close();
    micTrackRef.current = null;
    remoteAudioTracksRef.current.clear();
    const client = clientRef.current;
    if (client) {
      clientRef.current = null;
      client.removeAllListeners();
      await client.leave().catch(() => {});
    }
    setConnected(false);
    setSpeakingLevels(new Map());
    setAutoplayBlocked(false);
  }, []);

  const join = useCallback(
    async (roomId: string) => {
      if (connecting || (connected && activeRoomIdRef.current === roomId)) return;
      if (clientRef.current) {
        await cleanupAgoraClient();
      }
      activeRoomIdRef.current = roomId;
      setActiveRoomId(roomId);
      setConnecting(true);
      try {
        const session = await liveApi.join(roomId);
        const role = (session.myRole?.toLowerCase() as LiveParticipantRole) ?? "audience";
        setMyRole(role);

        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        AgoraRTC.onAutoplayFailed = () => setAutoplayBlocked(true);

        const tokenDto = await liveApi.token(roomId);
        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.enableAudioVolumeIndicator();
        client.on("volume-indicator", (volumes) => {
          const levels = new Map<string, number>();
          for (const v of volumes) levels.set(String(v.uid), normalizeLevel(v.level));
          setSpeakingLevels(levels);
        });
        client.on("user-published", async (user, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "audio" && user.audioTrack) {
            remoteAudioTracksRef.current.set(String(user.uid), user.audioTrack);
            user.audioTrack.play();
          }
        });
        client.on("user-unpublished", (user) => {
          remoteAudioTracksRef.current.delete(String(user.uid));
        });

        await client.join(tokenDto.appId, tokenDto.channelName, tokenDto.token, tokenDto.uid);

        if (SPEAKING_ROLES.includes(role)) {
          await publishMicTrack(client, AgoraRTC);
        }

        setConnected(true);
        await refreshParticipants();
      } catch (error) {
        console.warn("[menzo/live] join failed", error);
        await cleanupAgoraClient();
        activeRoomIdRef.current = null;
        setActiveRoomId(null);
        setMyRole(null);
      } finally {
        setConnecting(false);
      }
    },
    [connecting, connected, cleanupAgoraClient, refreshParticipants, publishMicTrack]
  );

  const leave = useCallback(async () => {
    const roomId = activeRoomIdRef.current;
    await cleanupAgoraClient();
    activeRoomIdRef.current = null;
    setActiveRoomId(null);
    setMyRole(null);
    setParticipants([]);
    setSpeakingRequests([]);
    if (roomId) await liveApi.leave(roomId).catch(() => {});
  }, [cleanupAgoraClient]);

  /** Flujo completo del botón de micrófono (ver sección 17 del pedido):
   * 1. Ignora toques mientras ya hay un cambio en curso (evita el bug de doble-toque que dejaba
   *    el estado inconsistente si el segundo toque leía un `muted` viejo de un closure obsoleto —
   *    por eso se lee de mutedRef, no del parámetro capturado del useCallback).
   * 2. Verifica rol real (HOST/CO_HOST/SPEAKER) antes de tocar nada.
   * 3. Verifica que el track exista; si no, es porque publishMicTrack falló antes — reintenta en
   *    vez de fallar en silencio.
   * 4. Aplica el cambio, y si el SDK de Agora lo rechaza, revierte el estado visual y muestra el
   *    error en vez de dejar el botón mostrando algo que no coincide con lo que Agora hizo. */
  const toggleMute = useCallback(async () => {
    if (microphoneChanging) return;
    const role = myRoleRef.current;
    if (!role || !SPEAKING_ROLES.includes(role)) {
      setLastMicrophoneError("No tenés permiso para hablar en este LIVE.");
      return;
    }
    const roomId = activeRoomIdRef.current;
    const client = clientRef.current;
    if (!roomId || !client) return;

    setMicrophoneChanging(true);
    setLastMicrophoneError(null);
    try {
      if (!micTrackRef.current) {
        // El track nunca se pudo crear (permiso denegado, hardware ocupado) — reintentar en vez
        // de dejar un botón que no responde.
        const { default: AgoraRTC } = await import("agora-rtc-sdk-ng");
        await publishMicTrack(client, AgoraRTC);
        return;
      }
      const next = !mutedRef.current;
      await micTrackRef.current.setEnabled(!next);
      setMuted(next);
      liveApi.setMicrophone(roomId, !next).catch(() => {});
    } catch (error) {
      console.warn("[menzo/live] toggleMute failed", error);
      setLastMicrophoneError("No pudimos cambiar el micrófono. Intentá de nuevo.");
    } finally {
      setMicrophoneChanging(false);
    }
  }, [microphoneChanging, publishMicTrack]);

  const unlockAudio = useCallback(() => {
    for (const track of remoteAudioTracksRef.current.values()) {
      track.play();
    }
    setAutoplayBlocked(false);
  }, []);

  // ---- Acciones administrativas / de sesión — delegan al backend, que es la autoridad de roles.
  const startLive = useCallback(
    async (roomId: string, info?: { title?: string; description?: string; announcement?: string }) => {
      const dto = await liveApi.start(roomId, info);
      setViewingState(mapLiveSession(dto));
    },
    []
  );

  const endLive = useCallback(async (roomId: string) => {
    await liveApi.end(roomId);
    if (activeRoomIdRef.current === roomId) await leave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateLiveInfo = useCallback(
    async (roomId: string, info: { title?: string; description?: string; announcement?: string }) => {
      const dto = await liveApi.update(roomId, info);
      setViewingState(mapLiveSession(dto));
    },
    []
  );

  const requestToSpeak = useCallback(async () => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    await liveApi.requestToSpeak(roomId);
    setMyRole("requested");
  }, []);

  const cancelSpeakRequest = useCallback(async () => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    await liveApi.cancelSpeakRequest(roomId);
    setMyRole("audience");
  }, []);

  const approveSpeaking = useCallback(async (userId: string) => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    await liveApi.approveSpeaking(roomId, userId);
  }, []);

  const rejectSpeaking = useCallback(async (userId: string) => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    await liveApi.rejectSpeaking(roomId, userId);
  }, []);

  const demoteParticipant = useCallback(async (userId: string) => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    await liveApi.demoteParticipant(roomId, userId);
  }, []);

  const muteParticipant = useCallback(async (userId: string) => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    await liveApi.muteParticipant(roomId, userId);
  }, []);

  const removeParticipant = useCallback(async (userId: string) => {
    const roomId = activeRoomIdRef.current;
    if (!roomId) return;
    await liveApi.removeParticipant(roomId, userId);
  }, []);

  // Suscripción en vivo al roster/roles/solicitudes de la sala a la que estoy conectado —
  // independiente de qué pantalla se esté mirando, para que un cambio de rol o un mute forzado
  // se aplique aunque el usuario haya navegado a otra parte (el LIVE sigue minimizado).
  useEffect(() => {
    if (!activeRoomId) return;
    const unsubscribe = subscribeLiveTopic(activeRoomId, applyParticipantEvent);
    return unsubscribe;
  }, [activeRoomId, subscribeLiveTopic, applyParticipantEvent]);

  useEffect(() => {
    function handleBeforeUnload() {
      const roomId = activeRoomIdRef.current;
      if (roomId) liveApi.leave(roomId).catch(() => {});
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const canSpeak = myRole !== null && SPEAKING_ROLES.includes(myRole);

  const value = useMemo<LiveRoomContextValue>(
    () => ({
      watchedRoomId,
      viewingState,
      watchRoom: watchRoomWithCleanup,
      unwatchRoom,
      activeRoomId,
      connected,
      connecting,
      myRole,
      muted,
      microphoneChanging,
      microphonePermission,
      localAudioPublished,
      lastMicrophoneError,
      canSpeak,
      participants,
      speakingLevels,
      speakingRequests,
      autoplayBlocked,
      unlockAudio,
      join,
      leave,
      toggleMute,
      startLive,
      endLive,
      updateLiveInfo,
      requestToSpeak,
      cancelSpeakRequest,
      approveSpeaking,
      rejectSpeaking,
      demoteParticipant,
      muteParticipant,
      removeParticipant,
      refreshParticipants,
    }),
    [
      watchedRoomId,
      viewingState,
      watchRoomWithCleanup,
      unwatchRoom,
      activeRoomId,
      connected,
      connecting,
      myRole,
      muted,
      microphoneChanging,
      microphonePermission,
      localAudioPublished,
      lastMicrophoneError,
      canSpeak,
      participants,
      speakingLevels,
      speakingRequests,
      autoplayBlocked,
      unlockAudio,
      join,
      leave,
      toggleMute,
      startLive,
      endLive,
      updateLiveInfo,
      requestToSpeak,
      cancelSpeakRequest,
      approveSpeaking,
      rejectSpeaking,
      demoteParticipant,
      muteParticipant,
      removeParticipant,
      refreshParticipants,
    ]
  );

  return <LiveRoomContext.Provider value={value}>{children}</LiveRoomContext.Provider>;
}

function roleOrder(role: LiveParticipantRole): number {
  switch (role) {
    case "host":
      return 0;
    case "co_host":
      return 1;
    case "speaker":
      return 2;
    case "requested":
      return 3;
    default:
      return 4;
  }
}

export function useLiveRoomContext() {
  const ctx = useContext(LiveRoomContext);
  if (!ctx) throw new Error("useLiveRoomContext must be used within a LiveRoomProvider");
  return ctx;
}
