import { Avatar } from "./Avatar";
import type { TypingUser } from "@/lib/realtime/useRoomSocket";

export function TypingBubble({ typingUsers }: { typingUsers: TypingUser[] }) {
  if (typingUsers.length === 0) return null;

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0].displayName} está escribiendo`
      : typingUsers.length === 2
        ? `${typingUsers[0].displayName} y ${typingUsers[1].displayName} están escribiendo`
        : "Varias personas están escribiendo";

  return (
    <div className="flex max-w-[86%] items-end gap-2">
      <Avatar name={typingUsers[0].displayName} size={30} gradient="fire" />
      <div className="flex items-center gap-2 rounded-2xl rounded-tl-md bg-[var(--color-surface-secondary)] px-4 py-2.5 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.4)]">
        <span className="flex items-center gap-1">
          <span className="menzo-typing-dot h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: "0ms" }} />
          <span className="menzo-typing-dot h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: "150ms" }} />
          <span className="menzo-typing-dot h-1.5 w-1.5 rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: "300ms" }} />
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      </div>
    </div>
  );
}
