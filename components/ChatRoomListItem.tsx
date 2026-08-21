import Link from "next/link";

import { relativeTime } from "@/lib/time";
import { gradientCss } from "@/lib/theme";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import type { ChatRoom } from "@/lib/types";

import { Avatar } from "./Avatar";
import { ChatIcon } from "./icons";

export function ChatRoomListItem({
  room,
  onJoin,
  joining,
  lastMessageAuthorName,
}: {
  room: ChatRoom;
  /** Si se pasa, las salas públicas sin unirse muestran un botón "Unirse" en vez de navegar directo. */
  onJoin?: (roomId: string) => void;
  joining?: boolean;
  /** Nombre del autor del último mensaje — solo hace falta para salas públicas (ver el llamador,
   * que lo resuelve contra el store de usuarios), un DM ya sabe quién es la otra persona. */
  lastMessageAuthorName?: string;
}) {
  const title = room.peer?.displayName ?? room.name;
  const subtitle = room.type === "direct" ? (room.peer?.isOnline ? "En línea" : "Desconectado") : `${room.onlineCount} conectados`;
  // Antes las salas públicas/grupales SIEMPRE mostraban description/topic acá, nunca el último
  // mensaje real (a diferencia de los DM) — la referencia (Chats/Mensajes) muestra "Hikari: ¿Qué
  // opinan del capítulo de hoy?" con el nombre del autor como prefijo, igual que Discord/Amino.
  const lastMessageBody = room.lastMessage
    ? room.lastMessage.hasImage && !room.lastMessage.body
      ? "📷 Foto"
      : room.lastMessage.body
    : undefined;
  const lastMessagePreview =
    room.type === "direct"
      ? lastMessageBody
      : lastMessageBody
        ? `${room.lastMessage!.senderId === LOCAL_USER_ID ? "Tú" : lastMessageAuthorName ?? "Alguien"}: ${lastMessageBody}`
        : room.description || room.topic;

  // Cada fila tiene su propia "personalidad de color" (estilo comunidad de Amino) en vez de ser
  // todas el mismo gris plano — el wash es deliberadamente sutil (baja opacidad) para no pisar la
  // legibilidad del texto, y sube un poco al pasar el mouse como señal de interactividad extra.
  const tintGradient = room.type === "direct" ? room.peer?.avatarGradient : room.gradient;
  const tintCss = tintGradient ? gradientCss(tintGradient) : undefined;

  return (
    <Link
      href={`/chat/${room.id}`}
      className="menzo-panel group relative flex items-center gap-4 overflow-hidden p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--color-border-strong)]"
    >
      {tintCss && (
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.13] transition-opacity duration-200 group-hover:opacity-[0.22]"
          style={{ background: tintCss }}
          aria-hidden
        />
      )}
      {room.type === "direct" && room.peer ? (
        <span className="relative shrink-0">
          <Avatar name={room.peer.displayName} avatarUri={room.peer.avatarUri} gradient={room.peer.avatarGradient} size={52} showOnline online={room.peer.isOnline} />
        </span>
      ) : (
        <span className="relative flex shrink-0 flex-col items-center gap-1">
          <span className="relative">
            {room.coverUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={room.coverUri} alt="" className="h-[52px] w-[52px] rounded-2xl object-cover shadow-md" />
            ) : (
              <span
                className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl text-white shadow-md"
                style={{ background: gradientCss(room.gradient) }}
              >
                <ChatIcon size={22} />
              </span>
            )}
            {room.live && (
              <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-coral)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white shadow">
                Live
              </span>
            )}
          </span>
          <span className="text-[9px] font-medium uppercase tracking-wide text-[var(--color-text-muted)]">Sala pública</span>
        </span>
      )}
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate font-display font-bold">{title}</span>
          {room.lastMessage && (
            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{relativeTime(room.lastMessage.createdAt)}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="block min-w-0 flex-1 truncate text-sm text-[var(--color-text-muted)]">{lastMessagePreview || subtitle}</span>
          {room.favorite && <span className="shrink-0 text-xs font-semibold text-[var(--color-yellow)]">★</span>}
        </span>
      </span>
      {onJoin && room.type === "public" && !room.joined && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onJoin(room.id);
          }}
          disabled={joining}
          className="relative shrink-0 rounded-full border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-medium disabled:opacity-50 cursor-pointer"
        >
          {joining ? "…" : "Unirse"}
        </button>
      )}
    </Link>
  );
}
