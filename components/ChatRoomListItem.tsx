import Link from "next/link";
import { useState } from "react";

import { relativeTime } from "@/lib/time";
import { gradientCss } from "@/lib/theme";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { useAppState } from "@/lib/AppStateContext";
import type { ChatRoom } from "@/lib/types";

import { Avatar } from "./Avatar";
import { ChatIcon, CloseIcon, StarIcon } from "./icons";
import { ConfirmDialog } from "./ui/ConfirmDialog";

export function ChatRoomListItem({
  room,
  onJoin,
  joining,
  lastMessageAuthorName,
  /** false en Descubrir/Búsqueda (salas que quizás ni son mías todavía) — true en la lista real
   * de "mis chats" (ver app/(app)/chat/page.tsx), que es donde tiene sentido poder sacarla de
   * encima con un solo click. */
  allowRemove = false,
}: {
  room: ChatRoom;
  /** Si se pasa, las salas públicas sin unirse muestran un botón "Unirse" en vez de navegar directo. */
  onJoin?: (roomId: string) => void;
  joining?: boolean;
  /** Nombre del autor del último mensaje — solo hace falta para salas públicas (ver el llamador,
   * que lo resuelve contra el store de usuarios), un DM ya sabe quién es la otra persona. */
  lastMessageAuthorName?: string;
  allowRemove?: boolean;
}) {
  const { actions } = useAppState();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);
  const isOwner = room.role === "owner";
  const title = room.peer?.displayName ?? room.name;
  const subtitle = room.type === "direct" ? (room.peer?.isOnline ? "En línea" : "Desconectado") : `${room.onlineCount} conectados`;
  // Antes las salas públicas/grupales SIEMPRE mostraban description/topic acá, nunca el último
  // mensaje real (a diferencia de los DM) — la referencia (Chats/Mensajes) muestra "Hikari: ¿Qué
  // opinan del capítulo de hoy?" con el nombre del autor como prefijo, igual que Discord/Amino.
  const lastMessageBody = room.lastMessage
    ? room.lastMessage.hasImage && !room.lastMessage.body
      ? "Foto"
      : room.lastMessage.body
    : undefined;
  const lastMessagePreview =
    room.type === "direct"
      ? lastMessageBody
      : lastMessageBody
        ? `${room.lastMessage!.senderId === LOCAL_USER_ID ? "Tú" : lastMessageAuthorName ?? "Alguien"}: ${lastMessageBody}`
        : room.description || room.topic;

  // Fila plana estilo WhatsApp/Telegram (antes: card con degradado + borde de "personalidad de
  // color" por sala) — se sacó a propósito, hacía que cada conversación se sintiera como una
  // card independiente en vez de una fila de lista. El único acento por sala que queda es el
  // color de fondo del ícono de las salas públicas sin foto de portada, más abajo.

  return (
    <Link
      href={`/chat/${room.id}`}
      className="group relative flex items-center gap-3 border-b border-[var(--color-border-soft)] px-1 py-3 transition-colors hover:bg-white/[0.04]"
    >
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
          <span className="truncate font-display text-[16.5px] font-semibold">{title}</span>
          {room.lastMessage && (
            <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{relativeTime(room.lastMessage.createdAt)}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="block min-w-0 flex-1 truncate text-sm text-[var(--color-text-secondary)]">{lastMessagePreview || subtitle}</span>
          {room.favorite && <StarIcon size={12} className="shrink-0 text-[var(--color-yellow)]" />}
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
      {allowRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirmRemove(true);
          }}
          aria-label={isOwner ? "Eliminar sala" : "Salir de la conversación"}
          title={isOwner ? "Eliminar sala" : "Salir de la conversación"}
          className="relative shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] opacity-0 transition-opacity hover:bg-[var(--color-coral)]/15 hover:text-[var(--color-coral)] group-hover:opacity-100 cursor-pointer"
        >
          <CloseIcon size={14} />
        </button>
      )}
      <ConfirmDialog
        open={confirmRemove}
        title={isOwner ? "Eliminar esta sala" : room.type === "direct" ? "Eliminar esta conversación" : "Salir de esta sala"}
        description={
          isOwner
            ? "Se elimina para todos los que están en ella — no se puede deshacer."
            : "Solo desaparece de tu lista, no te vuelve a llegar acá hasta que alguien te escriba de nuevo."
        }
        confirmLabel={isOwner ? "Eliminar para siempre" : "Salir"}
        danger={isOwner}
        busy={removing}
        onConfirm={async () => {
          setRemoving(true);
          try {
            await actions.leaveOrDeleteRoom(room.id, isOwner);
          } catch (error) {
            console.warn("[menzo/web] leaveOrDeleteRoom failed", error);
          } finally {
            setRemoving(false);
            setConfirmRemove(false);
          }
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </Link>
  );
}
