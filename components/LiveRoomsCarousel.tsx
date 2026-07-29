import Link from "next/link";

import { gradientCss } from "@/lib/theme";
import type { ChatRoom } from "@/lib/types";

import { ChatIcon } from "./icons";

/** Franja horizontal de salas en vivo — pensada para ir arriba del feed, así una sala con voz
 * activa se nota de inmediato en vez de mezclarse con el resto de las tarjetas. */
export function LiveRoomsCarousel({ rooms }: { rooms: ChatRoom[] }) {
  if (rooms.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      <p className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-[var(--color-coral)]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--color-coral)]" aria-hidden />
        En vivo ahora
      </p>
      <div className="flex snap-x gap-3 overflow-x-auto pb-1">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/chat/${room.id}`}
            className="relative flex w-[150px] shrink-0 snap-start flex-col justify-end overflow-hidden rounded-2xl bg-cover bg-center shadow-lg"
            style={{
              height: 96,
              backgroundImage: room.coverUri ? `url(${room.coverUri})` : gradientCss(room.gradient),
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            {!room.coverUri && (
              <span className="absolute inset-0 flex items-center justify-center text-white/70">
                <ChatIcon size={28} />
              </span>
            )}
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[var(--color-coral)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
              Live
            </span>
            <div className="relative z-10 flex flex-col gap-0.5 p-2.5 text-white">
              <span className="truncate text-xs font-semibold">{room.name}</span>
              <span className="text-[10px] text-white/75">{room.onlineCount} conectados</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
