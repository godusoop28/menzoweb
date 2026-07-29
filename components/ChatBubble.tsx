import Link from "next/link";

import { Avatar } from "./Avatar";
import { useAccent } from "@/lib/AccentContext";
import { relativeTime } from "@/lib/time";
import type { RoomRole } from "@/lib/api/types";
import type { DemoUser, Message } from "@/lib/types";

const ROLE_BADGE: Partial<Record<RoomRole, string>> = { OWNER: "👑", CO_HOST: "⭐" };

export function ChatBubble({
  message,
  author,
  isOwn,
  role,
  grouped,
}: {
  message: Message;
  author?: DemoUser;
  isOwn: boolean;
  role?: RoomRole;
  /** true si el mensaje anterior es del mismo autor, mismo día, y hace poco — oculta avatar/nombre
   * repetidos para que la conversación se lea como una sola racha, no mensajes sueltos. */
  grouped?: boolean;
}) {
  const accent = useAccent();

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
          {message.body}
        </span>
      </div>
    );
  }

  const badge = role ? ROLE_BADGE[role] : undefined;

  return (
    <div className={`flex max-w-[86%] items-end gap-2 ${isOwn ? "ml-auto flex-row-reverse" : ""} ${grouped ? "mt-[-6px]" : ""}`}>
      {grouped ? (
        <div className="w-[30px] shrink-0" aria-hidden />
      ) : author ? (
        <Link href={`/member/${author.id}`} className="shrink-0">
          <Avatar name={author.displayName} avatarUri={author.avatarUri} gradient={author.avatarGradient} size={30} level={author.level} />
        </Link>
      ) : (
        <Avatar name="?" gradient="fire" size={30} />
      )}
      <div
        className={`flex flex-col gap-1 rounded-2xl px-4 py-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.4)] ${
          isOwn ? "rounded-tr-md text-[var(--color-text-on-accent)]" : "rounded-tl-md bg-[var(--color-surface-secondary)]"
        }`}
        style={isOwn ? { background: accent.color } : undefined}
      >
        {!isOwn && !grouped && (
          <span className="flex items-center gap-1 text-xs font-bold text-[var(--color-cyan)]">
            {author ? (
              <Link href={`/member/${author.id}`} className="hover:underline">
                {author.displayName}
              </Link>
            ) : (
              "Miembro"
            )}
            {badge && <span aria-hidden>{badge}</span>}
          </span>
        )}
        {!!message.imageUri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.imageUri} alt="" className="h-[150px] w-[200px] rounded-lg object-cover" />
        )}
        {!!message.body && <p className="whitespace-pre-wrap text-sm">{message.body}</p>}
        <span className={`self-end text-[10px] ${isOwn ? "text-black/60" : "text-[var(--color-text-muted)]"}`}>
          {relativeTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}
