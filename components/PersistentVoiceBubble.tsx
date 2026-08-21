"use client";

import { usePathname, useRouter } from "next/navigation";

import { CloseIcon, MicIcon, MicOffIcon } from "@/components/icons";
import { useLiveRoomContext } from "@/lib/live/LiveRoomContext";

/** Burbuja flotante estilo "chat head" de Messenger — visible en cualquier pantalla mientras haya
 * un live conectado y no estemos ya mirando la sala de ese live. Tocarla vuelve a la sala; el
 * micrófono y salir están ahí mismo para no tener que volver a la sala solo para silenciarse.
 *
 * El aro/glow reacciona en vivo al máximo `speakingLevel` de la sala (propio o de cualquier otro
 * hablante) — antes era un `animate-ping` genérico y constante, sin relación real con el audio.
 * Mismo criterio visual que `_BubbleFace` en menzomovil (degradado cian→naranja, aro que crece
 * con el volumen), para que se sienta "la misma burbuja" en los dos clientes. */
export function PersistentVoiceBubble() {
  const { activeRoomId, connected, participants, muted, canSpeak, microphoneChanging, localAudioPublished, speakingLevels, leave, toggleMute } =
    useLiveRoomContext();
  const pathname = usePathname();
  const router = useRouter();

  if (!connected || !activeRoomId) return null;
  if (pathname === `/chat/${activeRoomId}`) return null;

  const host = participants.find((p) => p.role === "host") ?? participants[0];
  const label = host?.user.displayName ?? "Sala";
  const micLooksOff = muted || !localAudioPublished;
  const level = micLooksOff ? 0 : Math.max(0, ...Array.from(speakingLevels.values()));
  const voiceActive = level > 0.08;

  return (
    <div className="fixed bottom-24 right-4 z-30 md:bottom-6">
      <div
        className="flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-2 shadow-2xl backdrop-blur-md transition-shadow duration-150"
        style={{
          background: "rgba(15,17,23,0.82)",
          boxShadow: voiceActive
            ? `0 8px 28px -6px rgba(34,211,238,0.55), 0 0 ${8 + level * 22}px ${2 + level * 5}px rgba(34,211,238,${0.25 + level * 0.35})`
            : "0 8px 24px -8px rgba(0,0,0,0.5)",
          border: `1px solid ${voiceActive ? "rgba(34,211,238,0.6)" : "rgba(255,255,255,0.12)"}`,
        }}
      >
        <button
          onClick={() => router.push(`/chat/${activeRoomId}`)}
          aria-label={`Volver al live con ${label}`}
          title="Volver al live"
          className="relative flex shrink-0 items-center justify-center rounded-full text-white cursor-pointer transition-transform duration-150 ease-out"
          style={{
            width: 44,
            height: 44,
            background: "linear-gradient(135deg, #22D3EE, #FF7A1A)",
            transform: `scale(${voiceActive ? 1 + level * 0.16 : 1})`,
          }}
        >
          <MicIcon size={18} className="relative" />
          <span
            className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 text-[8px]"
            style={{
              background: micLooksOff ? "var(--color-text-muted)" : "var(--color-coral)",
              borderColor: "rgba(15,17,23,0.95)",
            }}
            aria-hidden
          >
            {micLooksOff ? <MicOffIcon size={9} /> : "●"}
          </span>
        </button>
        <button
          onClick={() => router.push(`/chat/${activeRoomId}`)}
          className="flex flex-col items-start pr-1 text-left cursor-pointer"
        >
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--color-coral)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-coral)]" aria-hidden />
            Live
          </span>
          <span className="max-w-[110px] truncate text-xs font-medium">{label}</span>
        </button>
        {canSpeak && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
            disabled={microphoneChanging}
            aria-label={!localAudioPublished ? "Reintentar micrófono" : muted ? "Activar micrófono" : "Silenciar micrófono"}
            title={!localAudioPublished ? "Reintentar micrófono" : muted ? "Activar micrófono" : "Silenciar micrófono"}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm cursor-pointer disabled:cursor-wait disabled:opacity-70 ${
              muted || !localAudioPublished ? "bg-[var(--color-coral)]/20 text-[var(--color-coral)]" : "bg-white/10"
            }`}
          >
            {muted || !localAudioPublished ? <MicOffIcon size={15} /> : <MicIcon size={15} />}
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            leave();
          }}
          aria-label="Salir del live"
          title="Salir del live"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm cursor-pointer"
        >
          <CloseIcon size={14} />
        </button>
      </div>
    </div>
  );
}
