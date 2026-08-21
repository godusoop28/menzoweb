import Link from "next/link";

import { gradientCss } from "@/lib/theme";
import type { ChatRoom } from "@/lib/types";

import { Avatar } from "./Avatar";

/** "Salas activas" — grid de call-cards, sección propia del blueprint (.call-grid en
 * web/styles.css): estado (EN VIVO/EN LLAMADA), título, participantes en línea con avatares
 * apilados, y un botón "Unirse" directo. Antes esto solo existía como un carrusel angosto
 * (LiveRoomsCarousel, `lg:hidden`) — la referencia lo muestra siempre como grid principal, no
 * solo en mobile.
 *
 * "Unirse" navega a la sala (mismo criterio que LiveRoomsCarousel) — entrar a un LIVE es
 * navegación + auto-join dentro de la pantalla de chat, no una llamada aparte a joinRoom (esa es
 * para unirse como MIEMBRO de una sala pública en la pestaña Descubrir, un concepto distinto). */
export function LiveRoomsGrid({ rooms }: { rooms: ChatRoom[] }) {
  if (rooms.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rooms.map((room) => {
        const stack = room.liveSummary?.host ? [room.liveSummary.host] : [];
        const count = room.liveSummary?.participantCount ?? room.onlineCount;
        const isCall = room.liveSummary?.speakerCount && room.liveSummary.speakerCount > 1;
        return (
          <Link
            key={room.id}
            href={`/chat/${room.id}`}
            className="menzo-panel relative flex min-h-[145px] flex-col overflow-hidden p-3.5 transition-colors hover:border-[var(--color-border-strong)]"
            style={{
              backgroundImage: `radial-gradient(circle at 75% 25%, ${isCall ? "rgba(255,122,0,0.20)" : "rgba(124,77,255,0.26)"}, transparent 60%)`,
            }}
          >
            <span
              className={`inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-extrabold ${
                isCall
                  ? "bg-[var(--color-orange)]/15 text-[var(--color-orange)]"
                  : "bg-[var(--color-coral)]/15 text-[var(--color-coral)]"
              }`}
            >
              {isCall ? "◉ EN LLAMADA" : "● EN VIVO"}
            </span>
            <h3 className="mt-2 font-display text-sm font-bold text-[var(--color-text-primary)]">
              {room.liveSummary?.title || room.name}
            </h3>
            <p className="mt-0.5 line-clamp-1 text-[11px] text-[var(--color-text-muted)]">
              {room.liveSummary?.announcement || room.description || `${count} conectados`}
            </p>
            <div className="mt-auto flex items-center justify-between pt-3">
              <div className="flex -space-x-2">
                {stack.map((peer) => (
                  <Avatar key={peer.id} name={peer.displayName} avatarUri={peer.avatarUri} gradient={peer.avatarGradient} size={24} />
                ))}
                {count > stack.length && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-surface-elevated)] text-[9px] font-bold text-[var(--color-text-muted)]">
                    +{count - stack.length}
                  </span>
                )}
              </div>
              <span
                style={{ background: room.coverUri ? undefined : gradientCss(room.gradient) }}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white"
              >
                Unirse
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
