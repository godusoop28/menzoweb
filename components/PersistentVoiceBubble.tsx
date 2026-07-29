"use client";

import { usePathname, useRouter } from "next/navigation";

import { useAccent } from "@/lib/AccentContext";
import { useVoiceRoomContext } from "@/lib/voice/VoiceRoomContext";

/** Burbuja flotante estilo "chat head" de Messenger — visible en cualquier pantalla mientras haya
 * un live conectado y no estemos ya mirando la sala de ese live. Tocarla vuelve a la sala; el
 * micrófono y salir están ahí mismo para no tener que volver a la sala solo para silenciarse. */
export function PersistentVoiceBubble() {
  const { activeRoomId, connected, participants, muted, leave, toggleMute } = useVoiceRoomContext();
  const pathname = usePathname();
  const router = useRouter();
  const accent = useAccent();

  if (!connected || !activeRoomId) return null;
  if (pathname === `/chat/${activeRoomId}`) return null;

  const label = participants[0]?.displayName ?? "Sala";

  return (
    <div className="fixed bottom-24 right-4 z-30 md:bottom-6">
      <div
        className="flex items-center gap-2 rounded-full bg-[var(--color-surface-elevated)] py-1.5 pl-1.5 pr-2 shadow-2xl ring-1 ring-[var(--color-border-strong)]"
        style={{ boxShadow: `0 8px 24px -6px ${accent.color}66` }}
      >
        <button
          onClick={() => router.push(`/chat/${activeRoomId}`)}
          aria-label={`Volver al live con ${label}`}
          title="Volver al live"
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white cursor-pointer"
          style={{ background: "linear-gradient(135deg, var(--color-coral), var(--color-orange))" }}
        >
          <span className="absolute -inset-0.5 animate-ping rounded-full bg-[var(--color-coral)]/40" aria-hidden />
          <span className="relative text-lg font-bold">{label.charAt(0).toUpperCase()}</span>
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          aria-label={muted ? "Activar micrófono" : "Silenciar micrófono"}
          title={muted ? "Activar micrófono" : "Silenciar micrófono"}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm cursor-pointer ${
            muted ? "bg-[var(--color-coral)]/20 text-[var(--color-coral)]" : "bg-[var(--color-surface-secondary)]"
          }`}
        >
          {muted ? "🔇" : "🎤"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            leave();
          }}
          aria-label="Salir del live"
          title="Salir del live"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-sm cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
