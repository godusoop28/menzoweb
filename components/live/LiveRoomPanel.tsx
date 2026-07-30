"use client";

import { useEffect, useState } from "react";

import { HandRaiseIcon, MicIcon, MicOffIcon, MinimizeIcon, MusicNoteIcon, SettingsIcon, UsersIcon } from "@/components/icons";
import { MenziIllustrationState } from "@/components/illustrations/MenziIllustrationState";
import { RoomSettingsPanel } from "@/components/room/RoomSettingsPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ApiError } from "@/lib/api";
import { useLiveRoomContext } from "@/lib/live/LiveRoomContext";
import { MenziDjPanel } from "@/components/music/MenziDjPanel";
import { useToast } from "@/lib/ToastContext";
import type { ChatRoom, LiveParticipant, LiveParticipantRole } from "@/lib/types";

import { LiveParticipantBubble } from "./LiveParticipantBubble";

const STAGE_ROLES: LiveParticipantRole[] = ["host", "co_host", "speaker"];

function useElapsed(startedAt: string | null | undefined) {
  const [label, setLabel] = useState("00:00");
  useEffect(() => {
    if (!startedAt) return;
    const started = new Date(startedAt).getTime();
    function tick() {
      const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
      const m = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
      const s = (seconds % 60).toString().padStart(2, "0");
      setLabel(`${m}:${s}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  return label;
}

/** La experiencia LIVE rediseñada: cabecera fija, escenario de participantes con jerarquía visual
 * (HOST > CO_HOSTS > SPEAKERS), anuncio tipo franja, audiencia agrupada abajo y controles según
 * el rol de quien mira. No destruye la conexión de Agora al minimizar — "minimizar" solo oculta
 * este overlay, el LiveRoomProvider sigue conectado (ver sección 26 del pedido). */
export function LiveRoomPanel({ room, onMinimize }: { room: ChatRoom; onMinimize: () => void }) {
  const live = useLiveRoomContext();
  const [showSettings, setShowSettings] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showAudience, setShowAudience] = useState(false);
  const isConnectedHere = live.activeRoomId === room.id;
  const elapsed = useElapsed(live.watchedRoomId === room.id ? live.viewingState?.startedAt : undefined);

  const stage = isConnectedHere ? live.participants.filter((p) => STAGE_ROLES.includes(p.role)) : [];
  const audience = isConnectedHere ? live.participants.filter((p) => !STAGE_ROLES.includes(p.role)) : [];
  const announcement = live.watchedRoomId === room.id ? live.viewingState?.announcement : room.liveSummary?.announcement;
  const title = (live.watchedRoomId === room.id ? live.viewingState?.title : room.liveSummary?.title) || room.name;
  const total = isConnectedHere ? live.participants.length : room.liveSummary?.participantCount ?? 0;
  const canModerate = room.role === "owner" || room.role === "co_host";

  const backgroundImage = room.coverUri || room.backgroundUri;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden" style={{ background: "var(--color-background-deep, #030509)" }}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: backgroundImage
            ? `linear-gradient(rgba(3,5,9,0.55), rgba(3,5,9,0.85)), url(${backgroundImage})`
            : "linear-gradient(160deg, #1a0f2e, #07090D 60%)",
          filter: backgroundImage ? "blur(2px)" : undefined,
        }}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--color-background)] to-transparent" aria-hidden />

      <div className="relative flex min-h-0 flex-1 flex-col">
        {/* Cabecera fija */}
        <div className="flex shrink-0 items-center gap-2 px-4 py-3">
          <span className="flex items-center gap-1 rounded-full bg-[var(--color-coral)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
            Live
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {total} personas · {elapsed}
            </p>
          </div>
          {canModerate && (
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Configuración del LIVE"
              title="Configuración del LIVE"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/40 text-white cursor-pointer"
            >
              <SettingsIcon size={17} />
            </button>
          )}
          <button
            onClick={onMinimize}
            aria-label="Minimizar"
            title="Minimizar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/40 text-white cursor-pointer"
          >
            <MinimizeIcon size={17} />
          </button>
        </div>

        {announcement && (
          <div className="mx-4 mb-2 flex shrink-0 items-start gap-2 rounded-2xl bg-black/40 px-3 py-2 text-xs backdrop-blur-sm">
            <span aria-hidden>📣</span>
            <p className="line-clamp-2">{announcement}</p>
          </div>
        )}

        {/* Escenario */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          {!isConnectedHere ? (
            <div className="flex h-full flex-col items-center justify-center">
              <MenziIllustrationState
                image="/illustrations/menzi/menzi-live-voice.webp"
                alt=""
                description={live.connecting ? "Conectando…" : "Conectate para escuchar este LIVE."}
                size="medium"
                action={!live.connecting ? { label: "Escuchar", onClick: () => live.join(room.id) } : undefined}
              />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-x-2 gap-y-4 py-2 sm:grid-cols-4 md:grid-cols-5">
              {stage.map((p) => (
                <StageSlot key={p.user.id} participant={p} speakingLevel={live.speakingLevels.get(p.user.id) ?? 0} />
              ))}
              {stage.length === 0 && (
                <p className="col-span-full py-8 text-center text-sm text-[var(--color-text-muted)]">Nadie está hablando todavía.</p>
              )}
            </div>
          )}
        </div>

        {/* Audiencia */}
        {isConnectedHere && (
          <div className="shrink-0 px-4 pb-1">
            <button
              onClick={() => setShowAudience((v) => !v)}
              className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-muted)] cursor-pointer"
            >
              <UsersIcon size={13} /> Escuchando ({audience.length}) {showAudience ? "▲" : "▼"}
            </button>
            {showAudience && (
              <div className="flex max-h-28 flex-wrap gap-x-3 gap-y-2 overflow-y-auto">
                {audience.map((p) => (
                  <div key={p.user.id} className="flex flex-col items-center gap-1">
                    <LiveParticipantBubble participant={p} size={36} speakingLevel={0} />
                  </div>
                ))}
                {audience.length === 0 && <p className="text-xs text-[var(--color-text-muted)]">Nadie más está escuchando todavía.</p>}
              </div>
            )}
          </div>
        )}

        {/* Controles inferiores */}
        {isConnectedHere && (
          <LiveControls
            room={room}
            onOpenSettings={() => setShowSettings(true)}
            onOpenMusic={() => setShowMusic(true)}
            onExit={onMinimize}
          />
        )}
      </div>

      {showMusic && <MenziDjPanel room={room} onClose={() => setShowMusic(false)} />}

      {showSettings && <RoomSettingsPanel room={room} onClose={() => setShowSettings(false)} initialTab="live" />}
    </div>
  );
}

function StageSlot({ participant, speakingLevel }: { participant: LiveParticipant; speakingLevel: number }) {
  const isHost = participant.role === "host";
  return <LiveParticipantBubble participant={participant} size={isHost ? 76 : 60} speakingLevel={speakingLevel} />;
}

type ControlVariant = "neutral" | "on" | "danger";

const VARIANT_CLASSES: Record<ControlVariant, string> = {
  neutral: "bg-white/10 hover:bg-white/20 text-white",
  // Estado "encendido/normal" del micrófono — deliberadamente sutil, no debe competir visualmente
  // con el estado silenciado (que sí necesita saltar a la vista, ver "danger" abajo).
  on: "bg-white/10 hover:bg-white/20 text-white",
  // Silenciado (o cualquier acción que corte la llamada) siempre en coral: es el único estado que
  // realmente necesita llamar la atención acá.
  danger: "bg-[var(--color-coral)] text-white hover:brightness-110",
};

function ControlButton({
  onClick,
  label,
  variant = "neutral",
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  variant?: ControlVariant;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-12 w-12 items-center justify-center rounded-full cursor-pointer transition-colors disabled:cursor-wait disabled:opacity-70 ${VARIANT_CLASSES[variant]}`}
    >
      {children}
    </button>
  );
}

function LiveControls({
  room,
  onOpenSettings,
  onOpenMusic,
  onExit,
}: {
  room: ChatRoom;
  onOpenSettings: () => void;
  onOpenMusic: () => void;
  onExit: () => void;
}) {
  const live = useLiveRoomContext();
  const showToast = useToast();
  const [confirmEndForAll, setConfirmEndForAll] = useState(false);
  const [endingForAll, setEndingForAll] = useState(false);
  const canModerate = room.role === "owner" || room.role === "co_host";

  // Única fuente de errores de micrófono (ver LiveRoomContext) — cualquier falla, sea al
  // publicar el track o al alternar mute, termina acá como un toast legible en vez de un botón
  // que simplemente no responde.
  useEffect(() => {
    if (live.lastMicrophoneError) showToast(live.lastMicrophoneError);
  }, [live.lastMicrophoneError, showToast]);

  async function handleRequestToSpeak() {
    try {
      await live.requestToSpeak();
    } catch {
      showToast("No pudimos enviar tu solicitud.");
    }
  }

  /** "Salir" es personal: me desconecto y cierro el panel, pero el LIVE sigue para los demás. */
  async function handleExit() {
    await live.leave();
    onExit();
  }

  /** "Finalizar LIVE" corta la llamada para TODOS — pide confirmación aparte porque no se puede
   * deshacer y afecta a cualquiera que esté escuchando en ese momento. */
  async function handleEndForAll() {
    if (endingForAll) return;
    setEndingForAll(true);
    try {
      await live.endLive(room.id);
      setConfirmEndForAll(false);
      onExit();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos finalizar el LIVE.");
    } finally {
      setEndingForAll(false);
    }
  }

  return (
    <>
      <div
        className="flex shrink-0 flex-wrap items-center justify-center gap-3 px-4 py-4"
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      >
        {live.canSpeak && (
          <ControlButton
            onClick={live.toggleMute}
            disabled={live.microphoneChanging}
            label={
              !live.localAudioPublished
                ? "Reintentar micrófono"
                : live.muted
                  ? "Activar micrófono"
                  : "Silenciar micrófono"
            }
            variant={live.muted || !live.localAudioPublished ? "danger" : "on"}
          >
            {live.muted || !live.localAudioPublished ? <MicOffIcon size={18} /> : <MicIcon size={18} />}
          </ControlButton>
        )}
        {live.myRole === "audience" && (
          <button
            onClick={handleRequestToSpeak}
            className="flex h-12 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white cursor-pointer hover:bg-white/20"
          >
            <HandRaiseIcon size={16} /> Solicitar hablar
          </button>
        )}
        {live.myRole === "requested" && (
          <button
            onClick={() => live.cancelSpeakRequest()}
            className="flex h-12 items-center gap-2 rounded-full bg-[var(--color-yellow)]/20 px-4 text-sm font-semibold text-[var(--color-yellow)] cursor-pointer"
          >
            <HandRaiseIcon size={16} /> Solicitud enviada · Cancelar
          </button>
        )}
        <ControlButton onClick={onOpenMusic} label="Menzi DJ">
          <MusicNoteIcon size={18} />
        </ControlButton>
        {canModerate && (
          <ControlButton onClick={onOpenSettings} label="Solicitudes y moderación">
            <UsersIcon size={18} />
          </ControlButton>
        )}
        {canModerate && (
          <button
            onClick={() => setConfirmEndForAll(true)}
            className="flex h-12 items-center gap-2 rounded-full bg-[var(--color-coral)] px-4 text-sm font-bold text-white cursor-pointer hover:brightness-110"
          >
            📞 Finalizar LIVE
          </button>
        )}
        <button
          onClick={handleExit}
          className="flex h-12 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white cursor-pointer hover:bg-white/20"
        >
          Salir
        </button>
      </div>

      <ConfirmDialog
        open={confirmEndForAll}
        title="Finalizar LIVE para todos"
        description="Se cortará la llamada para todas las personas que están escuchando ahora mismo. No se puede deshacer."
        confirmLabel="Finalizar para todos"
        busy={endingForAll}
        danger
        onConfirm={handleEndForAll}
        onCancel={() => setConfirmEndForAll(false)}
      />
    </>
  );
}
