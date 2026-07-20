import Link from "next/link";

import { gradientCss } from "@/lib/theme";
import type { ChatRoom } from "@/lib/types";

import { Avatar } from "./Avatar";
import { ChatIcon } from "./icons";

export function ChatRoomListItem({ room }: { room: ChatRoom }) {
  const title = room.peer?.displayName ?? room.name;
  const subtitle = room.type === "direct" ? (room.peer?.isOnline ? "En línea" : "Desconectado") : `${room.onlineCount} conectados`;
  const lastMessagePreview = room.type === "direct" ? undefined : room.description || room.topic;

  return (
    <Link
      href={`/chat/${room.id}`}
      className="flex items-center gap-4 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
    >
      {room.type === "direct" && room.peer ? (
        <Avatar name={room.peer.displayName} avatarUri={room.peer.avatarUri} gradient={room.peer.avatarGradient} size={48} showOnline online={room.peer.isOnline} />
      ) : (
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-md"
          style={{ background: gradientCss(room.gradient) }}
        >
          <ChatIcon size={20} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-sm text-[var(--color-text-muted)]">{lastMessagePreview || subtitle}</span>
      </span>
      {room.favorite && <span className="shrink-0 text-xs font-semibold text-[var(--color-yellow)]">★</span>}
    </Link>
  );
}
