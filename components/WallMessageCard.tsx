import Link from "next/link";

import { useAppState } from "@/lib/AppStateContext";
import { relativeTime } from "@/lib/time";
import { findUser } from "@/lib/store/selectors";
import type { WallMessage } from "@/lib/types";

import { Avatar } from "./Avatar";

export function WallMessageCard({ message }: { message: WallMessage }) {
  const { state } = useAppState();
  const author = findUser(state.social, message.authorId);
  if (!author) return null;

  return (
    <div className="flex gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.4)]">
      <Link href={`/member/${author.id}`}>
        <Avatar name={author.displayName} avatarUri={author.avatarUri} gradient={author.avatarGradient} size={34} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={`/member/${author.id}`} className="text-sm font-semibold">
          {author.displayName}
        </Link>
        <p className="text-sm text-[var(--color-text-secondary)]">{message.body}</p>
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{relativeTime(message.createdAt)}</p>
      </div>
    </div>
  );
}
