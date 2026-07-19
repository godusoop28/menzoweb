import Link from "next/link";

import { gradientCss } from "@/lib/theme";
import type { ChatRoom } from "@/lib/types";

export function ChatRoomListItem({ room }: { room: ChatRoom }) {
  const title = room.peer?.displayName ?? room.name;
  const subtitle = room.type === "direct" ? (room.peer?.isOnline ? "En línea" : "Desconectado") : `${room.onlineCount} conectados`;

  return (
    <Link
      href={`/chat/${room.id}`}
      className="flex items-center gap-4 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 hover:bg-[var(--color-surface-secondary)]"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white font-semibold"
        style={{ background: gradientCss(room.gradient) }}
      >
        {title.charAt(0).toUpperCase()}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{title}</span>
        <span className="block truncate text-sm text-[var(--color-text-muted)]">{subtitle}</span>
      </span>
    </Link>
  );
}
