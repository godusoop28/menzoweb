"use client";

import { Avatar } from "@/components/Avatar";
import { MicOffIcon, VolumeIcon, VolumeMuteIcon } from "@/components/icons";
import type { LiveParticipant, LiveParticipantRole } from "@/lib/types";

// "requested" (pedir para hablar) se sacó de la experiencia (ver sección de eliminación de
// "Levantar la mano") — el valor de rol sigue existiendo en el tipo (viene del backend, no se
// tocan contratos), pero acá se trata igual que "audience": sin aro ni badge propio.
const ROLE_RING: Record<LiveParticipantRole, string | null> = {
  host: "var(--color-orange)",
  co_host: "var(--color-purple)",
  speaker: "var(--color-cyan)",
  requested: null,
  audience: null,
};

const ROLE_BADGE: Record<LiveParticipantRole, string | null> = {
  host: "Anfitrión",
  co_host: "Coanfitrión",
  speaker: "Hablante",
  requested: null,
  audience: null,
};

/** Burbuja de participante del LIVE: avatar circular + aro de color por rol + halo animado
 * cuando Agora reporta que está hablando + badge de micrófono silenciado. El color del aro nunca
 * es la única señal de rol — el badge de texto lo acompaña siempre (ver sección 20 del pedido). */
export function LiveParticipantBubble({
  participant,
  size = 64,
  speakingLevel = 0,
  onModerate,
  onOpenVolumeControl,
  locallyMuted = false,
  localVolume = 100,
}: {
  participant: LiveParticipant;
  size?: number;
  speakingLevel?: number;
  /** Presente solo cuando quien mira puede moderar a ESTE participante puntual (ver
   * LiveRoomPanel: nunca sobre uno mismo, y el backend vuelve a validar todo igual). Sin esto la
   * burbuja sigue siendo puramente presentacional, como antes. */
  onModerate?: (participant: LiveParticipant) => void;
  /** Abre el control de volumen/silencio LOCAL de este participante (ver
   * LiveRoomContext.setLocalParticipantVolume) — a diferencia de onModerate, disponible para
   * cualquiera que esté escuchando, no solo moderadores; nunca presente para el propio tile. */
  onOpenVolumeControl?: (participant: LiveParticipant) => void;
  locallyMuted?: boolean;
  localVolume?: number;
}) {
  const ring = ROLE_RING[participant.role];
  const badge = ROLE_BADGE[participant.role];
  const isSpeaking = speakingLevel > 0.06;
  const isMutedVisible = participant.role !== "audience" && participant.role !== "requested" && !participant.microphoneEnabled;

  return (
    <div
      className={`flex w-full flex-col items-center gap-1.5 rounded-2xl ${
        onModerate ? "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cyan)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]" : ""
      }`}
      role={onModerate ? "button" : undefined}
      tabIndex={onModerate ? 0 : undefined}
      aria-label={onModerate ? `Moderar a ${participant.user.displayName}` : undefined}
      onClick={onModerate ? () => onModerate(participant) : undefined}
      onKeyDown={
        onModerate
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onModerate(participant);
              }
            }
          : undefined
      }
    >
      <div className="relative" style={{ width: size + 10, height: size + 10 }}>
        {ring && (
          <div
            className={`absolute inset-0 rounded-full transition-all duration-150 ${participant.role === "requested" ? "animate-pulse" : ""}`}
            style={{
              boxShadow: isSpeaking
                ? `0 0 ${10 + speakingLevel * 20}px ${2 + speakingLevel * 4}px ${ring}99, 0 0 0 3px ${ring}`
                : `0 0 0 3px ${ring}`,
            }}
          />
        )}
        <div className="absolute inset-[5px]">
          <Avatar name={participant.user.displayName} avatarUri={participant.user.avatarUri} gradient={participant.user.avatarGradient} size={size} />
        </div>
        {isMutedVisible && (
          <span
            title="Micrófono silenciado"
            aria-label="Micrófono silenciado"
            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 text-white"
            style={{ background: "var(--color-coral)", borderColor: "var(--color-background)" }}
          >
            <MicOffIcon size={11} />
          </span>
        )}
        {onOpenVolumeControl && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenVolumeControl(participant);
            }}
            title="Volumen local"
            aria-label={`Ajustar volumen local de ${participant.user.displayName}`}
            className="absolute -bottom-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 cursor-pointer"
            style={{
              background: locallyMuted || localVolume !== 100 ? "var(--color-cyan)" : "var(--color-surface-secondary)",
              borderColor: "var(--color-background)",
              color: locallyMuted || localVolume !== 100 ? "var(--color-background)" : "var(--color-text-muted)",
            }}
          >
            {locallyMuted ? <VolumeMuteIcon size={11} /> : <VolumeIcon size={11} />}
          </button>
        )}
      </div>
      <p className="max-w-[76px] truncate text-center text-[11px] font-medium">{participant.user.displayName}</p>
      {badge && (
        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide" style={{ color: ring ?? undefined, background: ring ? `${ring}22` : undefined }}>
          {badge}
        </span>
      )}
    </div>
  );
}
