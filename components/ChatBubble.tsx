import { Avatar } from "./Avatar";
import { relativeTime } from "@/lib/time";
import type { DemoUser, Message } from "@/lib/types";

export function ChatBubble({
  message,
  author,
  isOwn,
  showAvatar = true,
}: {
  message: Message;
  author?: DemoUser;
  isOwn: boolean;
  showAvatar?: boolean;
}) {
  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
          {message.body}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex max-w-[86%] items-end gap-2 ${isOwn ? "ml-auto flex-row-reverse" : ""}`}>
      {showAvatar ? (
        <Avatar name={author?.displayName ?? "?"} avatarUri={author?.avatarUri} gradient={author?.avatarGradient ?? "fire"} size={30} />
      ) : (
        <div className="w-[30px] shrink-0" />
      )}
      <div
        className={`flex flex-col gap-1 rounded-2xl px-4 py-2 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.4)] ${
          isOwn
            ? `bg-[var(--color-orange)] text-[var(--color-text-on-accent)] ${showAvatar ? "rounded-tr-md" : ""}`
            : `bg-[var(--color-surface-secondary)] ${showAvatar ? "rounded-tl-md" : ""}`
        }`}
      >
        {!isOwn && showAvatar && <span className="text-xs font-bold text-[var(--color-cyan)]">{author?.displayName ?? "Miembro"}</span>}
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
