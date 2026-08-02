"use client";

import { Avatar } from "@/components/Avatar";
import { MicOffIcon } from "@/components/icons";
import type { LiveParticipant, LiveParticipantRole } from "@/lib/types";

const ROLE_RING: Record<LiveParticipantRole, string | null> = {
  host: "var(--color-orange)",
  co_host: "var(--color-purple)",
  speaker: "var(--color-cyan)",
  requested: "var(--color-yellow)",
  audience: null,
};

const ROLE_BADGE: Record<LiveParticipantRole, string | null> = {
  host: "Anfitrión",
  co_host: "Coanfitrión",
  speaker: "Hablante",
  requested: "Solicita hablar",
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
}: {
  participant: LiveParticipant;
  size?: number;
  speakingLevel?: number;
  /** Presente solo cuando quien mira puede moderar a ESTE participante puntual (ver
   * LiveRoomPanel: nunca sobre uno mismo, y el backend vuelve a validar todo igual). Sin esto la
   * burbuja sigue siendo puramente presentacional, como antes. */
  onModerate?: (participant: LiveParticipant) => void;
}) {
  const ring = ROLE_RING[participant.role];
  const badge = ROLE_BADGE[participant.role];
  const isSpeaking = speakingLevel > 0.06;
  const isMutedVisible = participant.role !== "audience" && participant.role !== "requested" && !participant.microphoneEnabled;

  return (
    <div
      className={`flex w-full flex-col items-center gap-1.5 ${onModerate ? "cursor-pointer" : ""}`}
      role={onModerate ? "button" : undefined}
      tabIndex={onModerate ? 0 : undefined}
      onClick={onModerate ? () => onModerate(participant) : undefined}
      onKeyDown={
        onModerate
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onModerate(participant);
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
