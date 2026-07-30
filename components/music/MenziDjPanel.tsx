"use client";

import { useEffect, useRef, useState } from "react";

import {
  CheckIcon,
  MusicNoteIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  SkipNextIcon,
  StopIcon,
  TrashIcon,
  VolumeIcon,
  VolumeMuteIcon,
} from "@/components/icons";
import { MenziIllustrationState } from "@/components/illustrations/MenziIllustrationState";
import { MenziDjBrand, type MenziDjMode } from "@/components/music/MenziDjBrand";
import { Sheet } from "@/components/ui/Sheet";
import { ApiError } from "@/lib/api";
import { useMenziDjContext } from "@/lib/music/MenziDjContext";
import { useToast } from "@/lib/ToastContext";
import type { ChatRoom, MusicSessionSummary, QueueItem, YoutubeSearchResult } from "@/lib/types";

type Tab = "search" | "queue" | "requests" | "history";

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function useDisplayPosition(session: MusicSessionSummary | null): number {
  // Clave que agrupa todo lo que debería reiniciar el contador visual (cambió la canción, se
  // pausó/reanudó, llegó un snapshot nuevo). Reajustar `displayed` cuando esta clave cambia
  // durante el render (no en un efecto) evita el re-render en cascada que señala el linter.
  const key = `${session?.musicSessionId ?? ""}:${session?.positionSeconds ?? 0}:${session?.status ?? ""}:${session?.currentVideoId ?? ""}`;
  const [syncedKey, setSyncedKey] = useState(key);
  const [displayed, setDisplayed] = useState(session?.positionSeconds ?? 0);
  if (key !== syncedKey) {
    setSyncedKey(key);
    setDisplayed(session?.positionSeconds ?? 0);
  }

  useEffect(() => {
    if (!session || session.status !== "playing") return;
    const base = session.positionSeconds;
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setDisplayed(base + Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.musicSessionId, session?.positionSeconds, session?.status, session?.currentVideoId]);
  return displayed;
}

export function MenziDjPanel({ room, onClose }: { room: ChatRoom; onClose: () => void }) {
  const music = useMenziDjContext();
  const canModerate = room.role === "owner" || room.role === "co_host";
  const [tab, setTab] = useState<Tab>("search");
  const showToast = useToast();

  useEffect(() => {
    music.setExpanded(true);
    return () => music.setExpanded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const session = music.session;
  const displayPosition = useDisplayPosition(session);

  async function handlePlayPause() {
    try {
      if (session?.status === "playing") await music.pauseTrack();
      else await music.resumeTrack();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos controlar la música.");
    }
  }

  async function handleSkip() {
    try {
      await music.skip();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos saltar la canción.");
    }
  }

  async function handleStop() {
    try {
      await music.stopMusic();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos detener la música.");
    }
  }

  const brandMode: MenziDjMode = session?.status === "error" ? "error" : session?.status === "playing" ? "playing" : session?.status === "paused" ? "paused" : "idle";

  return (
    <Sheet open onClose={onClose} title="Menzi DJ" subtitle={room.name} widthClassName="max-w-xl">
      <div className="flex flex-col gap-4">
        <MenziDjBrand mode={brandMode} />

        {session?.status === "error" && (
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-coral)]/30 bg-[var(--color-coral)]/10 p-3">
            <p className="min-w-0 flex-1 text-sm text-[var(--color-coral)]">No pudimos conectar con YouTube. Puede ser un problema temporal.</p>
            <button
              onClick={() => music.refresh()}
              className="shrink-0 rounded-full bg-[var(--color-coral)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Reproduciendo ahora — el reproductor real de YouTube flota aparte (ver
            MenziDjPlayerHost); acá se muestra la info + controles sincronizados. Sin canción
            todavía, la miniatura real se reemplaza por la ilustración de bienvenida (nunca
            compiten entre sí, ver sección 6 del pedido). */}
        {session?.currentVideoId ? (
          <div className="flex gap-3 rounded-2xl bg-[var(--color-surface-secondary)] p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-black">
              {session.currentThumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.currentThumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--color-text-muted)]">
                  <MusicNoteIcon size={22} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{session.currentTitle}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">{session.currentChannelTitle}</p>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
                <div
                  className="h-full rounded-full bg-[var(--color-cyan)]"
                  style={{
                    width: session.durationSeconds ? `${Math.min(100, (displayPosition / session.durationSeconds) * 100)}%` : "0%",
                  }}
                />
              </div>
              <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                {formatDuration(displayPosition)} / {formatDuration(session.durationSeconds)}
              </p>
            </div>
          </div>
        ) : (
          <MenziIllustrationState
            image="/illustrations/menzi/menzi-dj-hero.webp"
            alt="Menzi con audífonos y notas musicales"
            title="Menzi DJ"
            description="Busca una canción o pega un enlace para comenzar."
            size="small"
            priority
          />
        )}

        {/* Controles — sincronizados para todos si sos OWNER/CO_HOST; volumen local para todos. */}
        <div className="flex items-center justify-center gap-3">
          {canModerate && session?.currentVideoId && (
            <>
              <button
                onClick={handlePlayPause}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-orange)] text-black cursor-pointer"
                aria-label={session.status === "playing" ? "Pausar" : "Reproducir"}
              >
                {session.status === "playing" ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
              </button>
              <button
                onClick={handleSkip}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] cursor-pointer"
                aria-label="Siguiente"
              >
                <SkipNextIcon size={18} />
              </button>
              <button
                onClick={handleStop}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-coral)]/15 text-[var(--color-coral)] cursor-pointer"
                aria-label="Detener"
              >
                <StopIcon size={18} />
              </button>
            </>
          )}
          <button
            onClick={music.toggleLocalMute}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] cursor-pointer"
            aria-label={music.localMuted ? "Activar música (solo para vos)" : "Silenciar música (solo para vos)"}
            title="Volumen local — no afecta a los demás"
          >
            {music.localMuted ? <VolumeMuteIcon size={18} /> : <VolumeIcon size={18} />}
          </button>
          {!music.localMuted && (
            <input
              type="range"
              min={0}
              max={100}
              value={music.localVolume}
              onChange={(e) => music.setLocalVolume(Number(e.target.value))}
              className="w-20 cursor-pointer accent-[var(--color-cyan)]"
              aria-label="Volumen local de la música"
            />
          )}
        </div>

        {/* Pestañas */}
        <div className="flex gap-1 overflow-x-auto border-b border-[var(--color-border-soft)] pb-2">
          <TabButton active={tab === "search"} onClick={() => setTab("search")}>
            Buscar
          </TabButton>
          <TabButton active={tab === "queue"} onClick={() => setTab("queue")}>
            Cola {session ? `(${session.queue.length})` : ""}
          </TabButton>
          {canModerate && (
            <TabButton active={tab === "requests"} onClick={() => setTab("requests")}>
              Solicitudes {session && session.pendingRequests.length > 0 ? `(${session.pendingRequests.length})` : ""}
            </TabButton>
          )}
          <TabButton active={tab === "history"} onClick={() => setTab("history")}>
            Historial
          </TabButton>
        </div>

        {tab === "search" && <SearchTab canModerate={canModerate} />}
        {tab === "queue" && <QueueTab session={session} canModerate={canModerate} />}
        {tab === "requests" && canModerate && <RequestsTab session={session} />}
        {tab === "history" && <HistoryTab session={session} />}
      </div>
    </Sheet>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${
        active ? "bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
      }`}
    >
      {children}
    </button>
  );
}

function SearchTab({ canModerate }: { canModerate: boolean }) {
  const music = useMenziDjContext();
  const showToast = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YoutubeSearchResult[] | null>(null);
  // Distinto de `results` a propósito: un error de red/YouTube NUNCA debe verse como "sin
  // resultados" (results=[]) — antes el catch hacía setResults([]) y la búsqueda fallida se
  // mostraba idéntica a una búsqueda real sin coincidencias, ocultando el error real.
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);

  function messageForSearchError(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.code === "MENZI_DJ_RATE_LIMITED") {
        return error.retryAfterSeconds
          ? `Estás buscando demasiado rápido. Esperá ${error.retryAfterSeconds}s e intentá de nuevo.`
          : "Estás buscando demasiado rápido. Esperá unos segundos e intentá de nuevo.";
      }
      if (error.code === "YOUTUBE_QUOTA_EXCEEDED") return "Se alcanzó el límite de búsquedas de música por hoy. Intentá más tarde.";
      if (error.code === "YOUTUBE_NOT_CONFIGURED" || error.code === "YOUTUBE_AUTH_ERROR") return "La búsqueda de música no está disponible en este momento.";
      if (error.code === "YOUTUBE_TIMEOUT") return "YouTube tardó demasiado en responder. Intentá de nuevo.";
      if (error.code === "LIVE_NOT_ACTIVE") return "El LIVE ya no está activo.";
      return error.message;
    }
    return "No pudimos buscar música en este momento.";
  }

  // Único punto de entrada para disparar una búsqueda (botón y Enter en el input llaman a esta
  // misma función) — el guard de `searchingRef` es necesario ADEMÁS de `disabled={searching}` en
  // el botón: React no vuelve a renderizar (y por lo tanto no deshabilita el botón/input) antes de
  // que termine el evento actual, así que Enter mantenido o Enter+click casi simultáneos podían
  // disparar dos fetch en paralelo. Un ref se lee/escribe sincrónicamente, sin esperar a un
  // re-render, así que sí corta el segundo llamado a tiempo.
  const searchingRef = useRef(false);

  async function handleSearch() {
    if (searchingRef.current) return;
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      showToast("Escribí al menos 3 caracteres para buscar.");
      return;
    }
    searchingRef.current = true;
    setSearching(true);
    setSearchError(null);
    try {
      const found = await music.searchSongs(trimmed);
      setResults(found);
    } catch (error) {
      // results se deja como estaba (null o la búsqueda previa) — solo searchError distingue el
      // estado de error, así el bloque "Sin resultados" nunca aparece para un fallo real.
      setSearchError(messageForSearchError(error));
    } finally {
      searchingRef.current = false;
      setSearching(false);
    }
  }

  async function handleAction(videoId: string, playNow: boolean) {
    setBusyVideoId(videoId);
    try {
      await music.addToQueue(videoId, playNow);
      showToast(playNow ? "Reproduciendo ahora." : "Se agregó a la cola.");
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos agregar esa canción.");
    } finally {
      setBusyVideoId(null);
    }
  }

  async function handleRequest(videoId: string) {
    setBusyVideoId(videoId);
    try {
      await music.requestSong(videoId);
      showToast("Solicitud enviada.");
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos enviar tu solicitud.");
    } finally {
      setBusyVideoId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          disabled={searching}
          placeholder="Busca una canción o pega un enlace"
          className="flex-1 rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)] disabled:opacity-60"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-orange)] text-black disabled:opacity-60 cursor-pointer"
        >
          <SearchIcon size={16} />
        </button>
      </div>
      {searching && <p className="text-center text-sm text-[var(--color-text-muted)]">Buscando…</p>}
      {!searching && searchError && (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-sm text-[var(--color-coral)]">{searchError}</p>
          <button
            onClick={handleSearch}
            className="rounded-full bg-[var(--color-surface-secondary)] px-4 py-1.5 text-xs font-semibold cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}
      {!searching && !searchError && results !== null && results.length === 0 && (
        <p className="text-center text-sm text-[var(--color-text-muted)]">No encontramos canciones con esa búsqueda.</p>
      )}
      <div className="flex flex-col gap-2">
        {!searchError &&
          results?.map((r) => (
          <div key={r.videoId} className="flex items-center gap-2.5 rounded-xl bg-[var(--color-surface-secondary)] p-2">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-black">
              {r.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.thumbnailUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{r.title}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">
                {r.channelTitle} · {formatDuration(r.durationSeconds)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              {canModerate ? (
                <>
                  <button
                    onClick={() => handleAction(r.videoId, true)}
                    disabled={busyVideoId === r.videoId}
                    title="Reproducir ahora"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-orange)] text-black disabled:opacity-60 cursor-pointer"
                  >
                    <PlayIcon size={13} />
                  </button>
                  <button
                    onClick={() => handleAction(r.videoId, false)}
                    disabled={busyVideoId === r.videoId}
                    title="Agregar a la cola"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] disabled:opacity-60 cursor-pointer"
                  >
                    <PlusIcon size={13} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleRequest(r.videoId)}
                  disabled={busyVideoId === r.videoId}
                  className="rounded-full bg-[var(--color-cyan)] px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-60 cursor-pointer"
                >
                  Solicitar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QueueTab({ session, canModerate }: { session: MusicSessionSummary | null; canModerate: boolean }) {
  const music = useMenziDjContext();
  const showToast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRemove(id: string) {
    setBusyId(id);
    try {
      await music.removeQueueItem(id);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos quitar esa canción.");
    } finally {
      setBusyId(null);
    }
  }

  if (!session || session.queue.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">La cola está vacía.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {session.queue.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2.5 rounded-xl bg-[var(--color-surface-secondary)] p-2">
          <span className="w-4 shrink-0 text-center text-xs text-[var(--color-text-muted)]">{index + 1}</span>
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black">
            {item.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">
              {item.channelTitle} · {formatDuration(item.durationSeconds)}
              {item.requestedBy && ` · pedida por ${item.requestedBy.displayName}`}
            </p>
          </div>
          {canModerate && (
            <button
              onClick={() => handleRemove(item.id)}
              disabled={busyId === item.id}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-coral)]/15 text-[var(--color-coral)] disabled:opacity-60 cursor-pointer"
              aria-label="Quitar de la cola"
            >
              <TrashIcon size={14} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function RequestsTab({ session }: { session: MusicSessionSummary | null }) {
  const music = useMenziDjContext();
  const showToast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function respond(id: string, approve: boolean) {
    setBusyId(id);
    try {
      if (approve) await music.approveRequest(id);
      else await music.rejectRequest(id);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos procesar la solicitud.");
    } finally {
      setBusyId(null);
    }
  }

  if (!session || session.pendingRequests.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">No hay solicitudes pendientes.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {session.pendingRequests.map((item) => (
        <div key={item.id} className="flex items-center gap-2.5 rounded-xl bg-[var(--color-surface-secondary)] p-2">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black">
            {item.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.title}</p>
            <p className="truncate text-xs text-[var(--color-text-muted)]">
              {item.requestedBy?.displayName ?? "Alguien"} solicitó esta canción
            </p>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button
              onClick={() => respond(item.id, true)}
              disabled={busyId === item.id}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-green)] text-black disabled:opacity-60 cursor-pointer"
              aria-label="Aprobar"
            >
              <CheckIcon size={14} />
            </button>
            <button
              onClick={() => respond(item.id, false)}
              disabled={busyId === item.id}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface-elevated)] disabled:opacity-60 cursor-pointer"
              aria-label="Rechazar"
            >
              <TrashIcon size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ session }: { session: MusicSessionSummary | null }) {
  if (!session || session.history.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">Todavía no sonó ninguna canción.</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {session.history.map((item) => (
        <HistoryRow key={item.id} item={item} />
      ))}
    </div>
  );
}

function HistoryRow({ item }: { item: QueueItem }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-[var(--color-surface-secondary)] p-2 opacity-80">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-black">
        {item.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.title}</p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">
          {item.channelTitle} · {item.status === "skipped" ? "saltada" : "reproducida"}
        </p>
      </div>
    </div>
  );
}
