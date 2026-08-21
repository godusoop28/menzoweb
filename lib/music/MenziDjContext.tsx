"use client";

import { Client, ReconnectionTimeMode } from "@stomp/stompjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { API_BASE_URL, getCachedSession, getMyRealId, mapMusicSession, mapYoutubeSearchResult, musicApi } from "@/lib/api";
import { useLiveRoomContext } from "@/lib/live/LiveRoomContext";
import type { LiveParticipantRole, MusicSessionSummary, YoutubeSearchResult } from "@/lib/types";

import { isFatalYoutubeError } from "./menziDjRecovery";
import { loadYouTubeIframeApi, YT_PLAYER_STATE, type YouTubePlayerLike } from "./youtubeIframeApi";

function wsUrl(): string {
  return API_BASE_URL.replace(/^http/, "ws") + "/ws";
}

const DRIFT_CHECK_INTERVAL_MS = 15_000;
const DRIFT_THRESHOLD_SECONDS = 2;
const AUTOPLAY_CHECK_DELAY_MS = 1500;
const DEFAULT_VOLUME = 80;
const DJ_ENABLED_STORAGE_KEY = "menzo.djEnabled";
// Auditoría de confiabilidad de DJ Menzi (ver menzomovil/MENZI_DJ_ARCHITECTURE.md — mismo
// endurecimiento aplicado acá): máximo 3 intentos de recuperación por ventana de 10s ante una
// pausa local sin ningún comando/evento que la explique, con backoff creciente entre intentos.
const UNEXPECTED_PAUSE_MAX_ATTEMPTS = 3;
const UNEXPECTED_PAUSE_WINDOW_MS = 10_000;
const PROGRESS_CHECK_DELAY_MS = 1200;
// Sección 22 del pedido — cuánto puede durar un BUFFERING legítimo (red lenta) antes de tratarlo
// como un stall real y disparar la recovery ladder. Más tolerante que el watchdog de "playing
// congelado" (ver DRIFT_CHECK_INTERVAL_MS más abajo) a propósito.
const BUFFERING_STALL_MS = 8_000;

type MenziDjContextValue = {
  roomId: string | null;
  session: MusicSessionSummary | null;
  loading: boolean;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
  /** Ocultar visualmente el video sin tocar la reproducción — el iframe sigue montado y sonando
   * igual, solo se lo cubre con una capa propia (nunca width/height:0, ver frameStyle en
   * MenziDjPlayerHost.tsx: eso SÍ podía dejar al iframe con una superficie de renderizado nula,
   * el mismo riesgo que llevó a la corrección equivalente en menzomovil). */
  videoHidden: boolean;
  setVideoHidden: (value: boolean) => void;
  /** Pantalla completa real — misma instancia de iframe, solo cambia a `position:fixed inset-0`
   * por CSS. Nunca crea un segundo player. */
  fullscreen: boolean;
  setFullscreen: (value: boolean) => void;
  /** Modo cine: video ancho arriba del panel, contenido (buscar/cola/historial) scrolleable
   * debajo — MenziDjPanel reserva ese espacio con un placeholder propio y reporta su posición
   * real en pantalla acá (ver `videoSlotRect`/`reportVideoSlotRect`) para que el iframe, que
   * sigue viviendo fuera del sheet (nunca se mueve al DOM del panel), se alinee visualmente sin
   * tener que reimplementar el modal con el player adentro. */
  cinema: boolean;
  setCinema: (value: boolean) => void;
  videoSlotRect: { top: number; left: number; width: number; height: number } | null;
  reportVideoSlotRect: (rect: { top: number; left: number; width: number; height: number } | null) => void;
  /** Setter, no el ref crudo — exponer un RefObject directo en el valor del contexto hace que el
   * linter (react-hooks/refs) trate CUALQUIER otro campo leído del mismo objeto como "acceso a un
   * ref durante el render", así que el <div> del player se registra acá en vez de leer
   * directamente `.current` desde afuera. */
  setPlayerContainer: (el: HTMLDivElement | null) => void;
  autoplayBlocked: boolean;
  unlockAutoplay: () => void;
  /** true cuando la recuperación automática de una pausa inesperada (ver
   * attemptUnexpectedPauseRecovery) agotó sus intentos sin éxito — la UI debe ofrecer "DJ Menzi
   * se pausó. Toca para continuar" en vez de seguir reintentando sola. */
  needsManualResume: boolean;
  localMuted: boolean;
  localVolume: number;
  toggleLocalMute: () => void;
  setLocalVolume: (value: number) => void;
  /** Apagado real de Menzi DJ para este dispositivo/pestaña — a diferencia de `videoHidden`
   * (solo tapa el video, el iframe sigue sonando a propósito, ver el comentario de esa clase),
   * esto mutea el audio local Y oculta el video a la vez. Antes no existía ningún apagado real
   * en la web (paridad con menzomovil, que tenía el mismo hueco — ver MenziDjState.djEnabled).
   * Persistido en localStorage, puramente por-dispositivo: nunca toca la sesión global. */
  djEnabled: boolean;
  toggleDjEnabled: () => void;
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

/** DJ Menzi no transmite audio por Agora — el reproductor oficial de YouTube corre en cada
 * dispositivo, sincronizado contra el estado canónico que guarda menzoapi. El player es UN SOLO
 * <div> montado acá, en el provider (nunca en una pantalla específica), así que sobrevive a
 * cambiar de pantalla o minimizar el LIVE igual que el engine de Agora en LiveRoomContext —
 * "expanded" solo cambia su tamaño/posición por CSS, nunca lo destruye ni crea uno nuevo.
 *
 * El ciclo de vida de la música está atado al de la voz (`live.activeRoomId`): si estás
 * conectado al audio del LIVE, DJ Menzi carga/sincroniza; si salís del LIVE, se limpia. No hay
 * un "watchRoom" independiente para música — no tiene sentido escuchar música de un LIVE al que
 * no estás conectado. */
export function MenziDjProvider({ children }: { children: React.ReactNode }) {
  const live = useLiveRoomContext();
  const [session, setSession] = useState<MusicSessionSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [videoHidden, setVideoHidden] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [cinema, setCinemaState] = useState(false);
  const [videoSlotRect, setVideoSlotRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const setCinema = useCallback((value: boolean) => {
    setCinemaState(value);
    if (!value) setVideoSlotRect(null);
  }, []);

  const reportVideoSlotRect = useCallback((rect: { top: number; left: number; width: number; height: number } | null) => {
    setVideoSlotRect((prev) => {
      if (prev === rect) return prev;
      if (prev && rect && prev.top === rect.top && prev.left === rect.left && prev.width === rect.width && prev.height === rect.height) {
        return prev;
      }
      return rect;
    });
  }, []);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  // Ver UNEXPECTED_PAUSE_MAX_ATTEMPTS — true solo cuando la recuperación automática agotó sus
  // intentos ante una pausa local sin ninguna causa válida (nunca ante el primer problema).
  const [needsManualResume, setNeedsManualResume] = useState(false);
  const [localMuted, setLocalMuted] = useState(false);
  const [localVolume, setLocalVolumeState] = useState(DEFAULT_VOLUME);
  const [djEnabled, setDjEnabledState] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(DJ_ENABLED_STORAGE_KEY) !== "false";
  });

  const roomIdRef = useRef<string | null>(null);
  const myRoleRef = useRef<LiveParticipantRole | null>(null);
  // Ver la rama onError de ensurePlayer — evita auto-saltear en loop si, por lo que sea, dos
  // errores fatales llegan para el mismo video.
  const lastAutoSkippedVideoIdRef = useRef<string | null>(null);
  // `ensurePlayer` se crea una sola vez ([] de deps) — necesita un ref para poder llamar a
  // `skip()` (definido más abajo, después de `applyControl`) sin recrear el player en cada
  // render. Se sincroniza con un useEffect junto a la definición real de `skip`.
  const skipRef = useRef<() => Promise<void>>(async () => {});
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
  // Ver el tick de driftIntervalRef más abajo — sección 7/22 del pedido de auditoría (watchdog de
  // progreso congelado / buffering prolongado).
  const lastObservedTimeRef = useRef<{ time: number; at: number } | null>(null);
  const bufferingSinceRef = useRef<number | null>(null);
  const localMutedRef = useRef(false);
  const localVolumeRef = useRef(DEFAULT_VOLUME);
  // Sección 28/29 del pedido de auditoría — protección de generación: cada `syncPlayerToSession`
  // toma un número antes de cualquier `await` (crear el player / cargar el video), y solo aplica
  // su resultado si sigue siendo la llamada más reciente cuando el await resuelve. Sin esto, dos
  // refresh()/eventos STOMP casi simultáneos (p. ej. SKIP + TRACK_CHANGED, o una reconexión que
  // dispara un refresh justo cuando ya había uno en vuelo) podían resolver fuera de orden y dejar
  // aplicado el snapshot VIEJO encima del nuevo.
  const generationRef = useRef(0);
  // Secuencia de refresh() (mismo criterio que _refreshRequestSeq en menzomovil) — un GET que
  // tarda más que uno posterior ya no debe poder pisar el estado con una respuesta obsoleta.
  const refreshSeqRef = useRef(0);
  // Última vez que ESTE cliente mandó pauseVideo() por una razón válida (pausa global real,
  // cambio de video) — permite distinguir esa pausa esperada de una que YouTube/el navegador
  // disparó solo, sin ningún comando ni evento STOMP de por medio (ver sección 4 del pedido:
  // nunca convertir una pausa local inesperada en un POST /pause global).
  const expectedLocalPauseUntilRef = useRef(0);
  const unexpectedPauseAttemptsRef = useRef(0);
  const unexpectedPauseWindowStartRef = useRef<number | null>(null);
  const recoveryInFlightRef = useRef(false);

  useEffect(() => {
    roomIdRef.current = live.activeRoomId;
  }, [live.activeRoomId]);
  // Ver la rama onError de ensurePlayer (sección 21 del pedido) — ese callback se crea una sola
  // vez ([] de deps, nunca se recrea), así que necesita un ref propio para leer el rol actual del
  // usuario en el momento del error, no el que tenía en el primer render.
  useEffect(() => {
    myRoleRef.current = live.myRole;
  }, [live.myRole]);
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

  /** Posición canónica "ahora" para ESTE snapshot — mismo cálculo que el drift-timer/backend
   * (sessionSnapshotAtRef + tiempo real transcurrido), reutilizado acá para saber dónde
   * corresponde reanudar/seekear durante una recuperación (sección 5, pasos 2 y 5). */
  const expectedPositionNow = useCallback(() => {
    const current = sessionRef.current;
    if (!current) return 0;
    const elapsed = (Date.now() - sessionSnapshotAtRef.current) / 1000;
    const raw = current.positionSeconds + elapsed;
    return current.durationSeconds != null ? Math.min(raw, current.durationSeconds) : raw;
  }, []);

  /** Recovery ladder (sección 5/6 del pedido de auditoría) — escalonada, con presupuesto acotado
   * (nunca un loop infinito) y backoff creciente entre pasos. Se activa SOLO cuando YouTube pausó
   * localmente sin que exista ninguna causa válida (ver handlePossibleUnexpectedPause): ni un
   * pauseVideo() propio reciente, ni serverState en pausa real. Pasos:
   *   1) confirmar que hay player;
   *   2) playVideo() simple (recupera la mayoría de los casos: un throttle momentáneo del tab,
   *      un blip de foco de audio);
   *   3) si sigue sin reproducir, seekTo(posición canónica actual) + playVideo() — cubre un
   *      player que quedó "colgado" en una posición vieja;
   *   4) si sigue sin reproducir, recargar el MISMO video en la posición canónica (loadVideoById)
   *      + playVideo() — el paso más agresivo antes de pedir un gesto real del usuario.
   * Nunca crea un segundo player/iframe (sección 2) — todo esto opera sobre `playerRef.current`.
   * Agotado el presupuesto: `needsManualResume` (paso 8), nunca antes. */
  const attemptUnexpectedPauseRecovery = useCallback(async () => {
    if (recoveryInFlightRef.current) return;
    const now = Date.now();
    if (
      unexpectedPauseWindowStartRef.current == null ||
      now - unexpectedPauseWindowStartRef.current > UNEXPECTED_PAUSE_WINDOW_MS
    ) {
      unexpectedPauseWindowStartRef.current = now;
      unexpectedPauseAttemptsRef.current = 0;
    }
    if (unexpectedPauseAttemptsRef.current >= UNEXPECTED_PAUSE_MAX_ATTEMPTS) {
      setNeedsManualResume(true);
      return;
    }
    unexpectedPauseAttemptsRef.current += 1;
    const attempt = unexpectedPauseAttemptsRef.current;
    recoveryInFlightRef.current = true;
    try {
      // Backoff creciente entre intentos — da margen real al player antes de escalar, en vez de
      // reintentar en caliente sobre el mismo problema.
      await new Promise((resolve) => window.setTimeout(resolve, 250 * attempt));
      const player = playerRef.current;
      if (!player || document.hidden || sessionRef.current?.status !== "playing") return;

      if (attempt === 1) {
        player.playVideo();
      } else if (attempt === 2) {
        player.seekTo(expectedPositionNow(), true);
        player.playVideo();
      } else {
        const videoId = sessionRef.current?.currentVideoId;
        if (videoId) player.loadVideoById(videoId, expectedPositionNow());
        player.playVideo();
      }
      applyLocalAudioState(player);

      await new Promise((resolve) => window.setTimeout(resolve, PROGRESS_CHECK_DELAY_MS));
      if (!playerRef.current || document.hidden) return;
      if (playerRef.current.getPlayerState() === YT_PLAYER_STATE.PLAYING) {
        unexpectedPauseAttemptsRef.current = 0;
        unexpectedPauseWindowStartRef.current = null;
        return;
      }
      if (sessionRef.current?.status !== "playing") return;
      recoveryInFlightRef.current = false;
      await attemptUnexpectedPauseRecovery();
      return;
    } finally {
      recoveryInFlightRef.current = false;
    }
  }, [applyLocalAudioState, expectedPositionNow]);

  const handlePossibleUnexpectedPause = useCallback(() => {
    const now = Date.now();
    // Pausa esperada (nosotros mismos acabamos de pedirla, ver `markExpectedLocalPause` en
    // syncPlayerToSession) o la sesión global ya está genuinamente en pausa/detenida — ninguna
    // de las dos es una pausa inexplicada, no hay nada que recuperar.
    if (now < expectedLocalPauseUntilRef.current) return;
    if (sessionRef.current?.status !== "playing") return;
    if (document.hidden) return;
    attemptUnexpectedPauseRecovery();
  }, [attemptUnexpectedPauseRecovery]);

  const handlePossibleUnexpectedPauseRef = useRef(handlePossibleUnexpectedPause);
  useEffect(() => {
    handlePossibleUnexpectedPauseRef.current = handlePossibleUnexpectedPause;
  }, [handlePossibleUnexpectedPause]);

  /** Ventana corta durante la que un pauseVideo() disparado por este mismo cliente (pausa global
   * real aplicada, o cambio de video) no debe confundirse con una pausa inexplicada — ver
   * handlePossibleUnexpectedPause. 1.5s alcanza de sobra: el evento `onStateChange` para un
   * pauseVideo() propio llega casi de inmediato. */
  const markExpectedLocalPause = useCallback(() => {
    expectedLocalPauseUntilRef.current = Date.now() + 1500;
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
                  } else if (event.data === YT_PLAYER_STATE.PLAYING) {
                    // Confirmó que sí está reproduciendo — cierra cualquier ventana de
                    // recuperación abierta (sección 5/6 del pedido); el siguiente pause
                    // inesperado, si lo hay, empieza una ventana nueva.
                    setAutoplayBlocked(false);
                    setNeedsManualResume(false);
                    unexpectedPauseAttemptsRef.current = 0;
                    unexpectedPauseWindowStartRef.current = null;
                  } else if (event.data === YT_PLAYER_STATE.PAUSED) {
                    handlePossibleUnexpectedPauseRef.current();
                  }
                },
                // Sección 21 del pedido — ausente hasta ahora en este player embebido: un video
                // no reproducible (eliminado, embed deshabilitado por el dueño) dejaba el player
                // mudo sin explicación ni avance, atascando la sala indefinidamente. Solo actúa
                // si el error es sobre la canción que está sonando AHORA (no un error viejo
                // llegando tarde, comparado contra `loadedVideoIdRef` en vez de contra `videoId`
                // capturado por este closure, que puede haber quedado obsoleto si el player se
                // reusó para otro video), este cliente tiene permiso de control, y no se
                // auto-saltó ya este mismo video (evita un loop si el siguiente también falla
                // instantáneo).
                onError: (event) => {
                  const errorCode = typeof event.data === "number" ? event.data : null;
                  if (errorCode == null || !isFatalYoutubeError(errorCode)) return;
                  const erroredVideoId = loadedVideoIdRef.current;
                  if (!erroredVideoId) return;
                  if (erroredVideoId !== sessionRef.current?.currentVideoId) return;
                  if (myRoleRef.current !== "host" && myRoleRef.current !== "co_host") return;
                  if (lastAutoSkippedVideoIdRef.current === erroredVideoId) return;
                  lastAutoSkippedVideoIdRef.current = erroredVideoId;
                  skipRef.current();
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
        markExpectedLocalPause();
        playerRef.current?.pauseVideo();
        return;
      }
      // Ver generationRef arriba — token tomado ANTES del único punto async real (crear/cargar
      // el player). Si para cuando resuelve ya hay una llamada más nueva en curso, esta se
      // descarta entera: nunca pisa `session`/el player con un snapshot que dejó de ser el actual.
      const generation = ++generationRef.current;
      const player = await ensurePlayer(next.currentVideoId);
      if (generation !== generationRef.current) return;
      if (!player) return;

      applyLocalAudioState(player);

      if (next.status === "playing") {
        player.seekTo(next.positionSeconds, true);
        player.playVideo();
        window.setTimeout(() => {
          if (generation !== generationRef.current) return;
          if (playerRef.current && playerRef.current.getPlayerState() !== YT_PLAYER_STATE.PLAYING) {
            setAutoplayBlocked(true);
          }
        }, AUTOPLAY_CHECK_DELAY_MS);
      } else if (next.status === "paused") {
        player.seekTo(next.positionSeconds, true);
        markExpectedLocalPause();
        player.pauseVideo();
      } else {
        markExpectedLocalPause();
        player.pauseVideo();
      }
    },
    [ensurePlayer, applyLocalAudioState, markExpectedLocalPause]
  );

  /** Ver refreshSeqRef arriba — sección 13 del pedido: "ante duda, GET snapshot" solo funciona
   * como fuente de verdad si una respuesta lenta no puede pisar a una más nueva que ya llegó
   * (p. ej. reconciliar al volver del background justo cuando el drift-timer también disparó un
   * refresh, o dos reconexiones STOMP seguidas). */
  const refresh = useCallback(async () => {
    const roomId = roomIdRef.current;
    if (!roomId) return;
    const seq = ++refreshSeqRef.current;
    setLoading(true);
    try {
      const dto = await musicApi.snapshot(roomId);
      if (seq !== refreshSeqRef.current) return;
      const mapped = mapMusicSession(dto, getMyRealId());
      setSession(mapped);
      setLoading(false);
      await syncPlayerToSession(mapped);
    } catch {
      if (seq !== refreshSeqRef.current) return;
      setSession(null);
      setLoading(false);
    }
  }, [syncPlayerToSession]);

  const unlockAutoplay = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    applyLocalAudioState(player);
    player.playVideo();
    setAutoplayBlocked(false);
    setNeedsManualResume(false);
    unexpectedPauseAttemptsRef.current = 0;
    unexpectedPauseWindowStartRef.current = null;
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

  const toggleDjEnabled = useCallback(() => {
    setDjEnabledState((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(DJ_ENABLED_STORAGE_KEY, String(next));
      }
      if (playerRef.current) {
        if (next) {
          playerRef.current.unMute();
          playerRef.current.setVolume(localVolumeRef.current);
        } else {
          playerRef.current.mute();
        }
      }
      setLocalMuted(!next);
      setVideoHidden(!next);
      return next;
    });
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

    // Reset de bookkeeping de recuperación al entrar a una sala nueva — sección 28/29: una
    // generación/ventana de recuperación de la sala anterior nunca debe condicionar la nueva.
    generationRef.current = 0;
    refreshSeqRef.current = 0;
    expectedLocalPauseUntilRef.current = 0;
    unexpectedPauseAttemptsRef.current = 0;
    unexpectedPauseWindowStartRef.current = null;
    recoveryInFlightRef.current = false;

    refresh();

    const cachedSession = getCachedSession();
    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: cachedSession ? { Authorization: `Bearer ${cachedSession.accessToken}` } : {},
      // Sección 12 del pedido de auditoría: backoff exponencial en vez de un delay fijo — un
      // corte de red real (no un blip de un segundo) ya no reintenta a ritmo constante contra un
      // servidor que puede seguir sin responder, y tope de 30s para no tardar de más en volver a
      // intentar apenas la red vuelve. `@stomp/stompjs` no expone jitter propio en esta versión;
      // el reconnectDelay inicial (3s) + el propio jitter natural de cuándo cada cliente detecta
      // el corte ya evita que todos los dispositivos de una sala reintenten en el mismo instante.
      reconnectDelay: 3000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      maxReconnectDelay: 30_000,
      onConnect: () => {
        client.subscribe(`/topic/rooms/${roomId}/music`, () => {
          // Cualquier evento LIVE_MUSIC_* — se vuelve a pedir el snapshot completo en vez de
          // intentar mergear el payload a mano; es más simple y a prueba de eventos perdidos u
          // orden inconsistente, y esta ruta ya es liviana. `refresh()` está secuenciado (ver
          // refreshSeqRef), así que varios eventos seguidos nunca aplican fuera de orden.
          refresh();
        });
      },
    });
    client.activate();
    stompRef.current = client;

    driftIntervalRef.current = setInterval(() => {
      // Sección 10/22 del pedido: mientras la pestaña está oculta, un timer de intervalo del
      // navegador puede quedar retenido/throttled y disparar con datos viejos apenas la pestaña
      // vuelve a estar visible — ese primer tick no es confiable para decidir un seek. La
      // reconciliación real al volver la hace el listener de `visibilitychange` de abajo, con un
      // GET fresco del snapshot en vez de este cálculo local.
      if (document.hidden) return;
      const player = playerRef.current;
      const current = sessionRef.current;
      if (!player || !current || current.status !== "playing") return;
      const playerState = player.getPlayerState();

      // Sección 22 del pedido — buffering NO es pause, pero tampoco puede durar para siempre sin
      // que nada reaccione: si sigue en BUFFERING más de BUFFERING_STALL_MS seguidos, se trata
      // como un stall real y se dispara la misma recovery ladder que cualquier otra pausa local
      // inesperada. Umbral más tolerante que el de "playing congelado" de abajo — un buffering
      // legítimo en una red lenta puede tardar varios segundos sin ser un problema real.
      if (playerState === YT_PLAYER_STATE.BUFFERING) {
        if (bufferingSinceRef.current == null) {
          bufferingSinceRef.current = Date.now();
        } else if (Date.now() - bufferingSinceRef.current > BUFFERING_STALL_MS) {
          bufferingSinceRef.current = null;
          attemptUnexpectedPauseRecovery();
        }
        return;
      }
      bufferingSinceRef.current = null;

      // Sección 7 del pedido — watchdog de progreso: hasta ahora solo se reaccionaba al evento
      // `onStateChange === PAUSED`. Un video que queda técnicamente en PLAYING pero con
      // `currentTime` congelado (un stall silencioso, distinto de una pausa explícita) no
      // disparaba nada. Se compara contra el tick anterior (no contra `expectedPosition`, que ya
      // se corrige solo con el seek de abajo): si de verdad no avanzó nada de un tick al
      // siguiente pese al intervalo completo transcurrido, el player está congelado de verdad.
      if (playerState === YT_PLAYER_STATE.PLAYING) {
        const localTime = player.getCurrentTime();
        const lastObserved = lastObservedTimeRef.current;
        if (lastObserved && localTime - lastObserved.time < 1 && Date.now() - lastObserved.at >= DRIFT_CHECK_INTERVAL_MS) {
          lastObservedTimeRef.current = { time: localTime, at: Date.now() };
          attemptUnexpectedPauseRecovery();
          return;
        }
        lastObservedTimeRef.current = { time: localTime, at: Date.now() };
      } else {
        lastObservedTimeRef.current = null;
      }

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

    // Sección 10 del pedido: al volver de una pestaña oculta/minimizada, nunca confiar en la
    // posición que el player quedó mostrando — pedir el snapshot real y reconciliar, mismo
    // criterio que `_handleAppForegrounded` en menzomovil. `refresh()` está secuenciado, así que
    // si además había un refresh en vuelo (p. ej. el drift-timer disparó uno justo antes) no hay
    // riesgo de que uno viejo pise a este.
    const handleVisibilityChange = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      client.deactivate();
      stompRef.current = null;
      if (driftIntervalRef.current) clearInterval(driftIntervalRef.current);
      driftIntervalRef.current = null;
      lastObservedTimeRef.current = null;
      bufferingSinceRef.current = null;
      lastAutoSkippedVideoIdRef.current = null;
      destroyPlayer();
      setSession(null);
      setExpanded(false);
      setNeedsManualResume(false);
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
      // Ver refreshSeqRef — mismo guard de generación que refresh() (sección 28/29 de la
      // auditoría de confiabilidad): sin esto, un addToQueue(playNow: true) que tarda podía
      // resolver DESPUÉS de un evento STOMP/refresh más nuevo y pisarlo con una sesión vieja.
      const seq = ++refreshSeqRef.current;
      const dto = await musicApi.addToQueue(roomId, { videoId, expectedVersion: currentVersion(), playNow });
      if (seq !== refreshSeqRef.current) return;
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

  // Ver refreshSeqRef — mismo guard de generación que refresh() (sección 28/29 de la auditoría
  // de confiabilidad): antes, play/pause/resume/skip/stop aplicaban su respuesta HTTP apenas
  // resolvía, sin comprobar si mientras tanto ya había llegado algo más nuevo (un refresh()
  // disparado por un evento STOMP, u otro control). Dos controles casi simultáneos (p. ej. SKIP
  // de un co-host mientras este cliente mandaba PAUSE) ya no pueden aplicarse fuera de orden.
  const applyControl = useCallback(
    async (action: (roomId: string, body: { expectedVersion?: number }) => Promise<import("@/lib/api").MusicSessionDto>) => {
      const roomId = roomIdRef.current;
      if (!roomId) return;
      const seq = ++refreshSeqRef.current;
      const dto = await action(roomId, { expectedVersion: currentVersion() });
      if (seq !== refreshSeqRef.current) return;
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

  useEffect(() => {
    skipRef.current = skip;
  }, [skip]);

  const seek = useCallback(
    async (seconds: number) => {
      const roomId = roomIdRef.current;
      if (!roomId) return;
      const seq = ++refreshSeqRef.current;
      const dto = await musicApi.seek(roomId, { positionSeconds: Math.round(seconds), expectedVersion: currentVersion() });
      if (seq !== refreshSeqRef.current) return;
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
      videoHidden,
      setVideoHidden,
      fullscreen,
      setFullscreen,
      cinema,
      setCinema,
      videoSlotRect,
      reportVideoSlotRect,
      setPlayerContainer,
      autoplayBlocked,
      unlockAutoplay,
      needsManualResume,
      localMuted,
      localVolume,
      toggleLocalMute,
      setLocalVolume,
      djEnabled,
      toggleDjEnabled,
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
      videoHidden,
      fullscreen,
      cinema,
      setCinema,
      videoSlotRect,
      reportVideoSlotRect,
      setPlayerContainer,
      autoplayBlocked,
      unlockAutoplay,
      needsManualResume,
      localMuted,
      localVolume,
      toggleLocalMute,
      setLocalVolume,
      djEnabled,
      toggleDjEnabled,
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
