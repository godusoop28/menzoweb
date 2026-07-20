import Link from "next/link";

import type { DemoUser } from "@/lib/types";

import { Avatar } from "./Avatar";

export function MemberCard({ user, variant = "row" }: { user: DemoUser; variant?: "row" | "column" }) {
  const isColumn = variant === "column";
  return (
    <Link
      href={`/member/${user.id}`}
      className={
        isColumn
          ? "flex w-24 flex-col items-center gap-1.5 text-center"
          : "flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)] hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
      }
    >
      <Avatar
        name={user.displayName}
        avatarUri={user.avatarUri}
        gradient={user.avatarGradient}
        size={isColumn ? 64 : 48}
        showOnline
        online={user.isOnline}
      />
      <div className={isColumn ? "" : "min-w-0 flex-1"}>
        <p className="truncate text-sm font-medium">{user.displayName}</p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">
          {user.isOnline ? user.activityStatus || "En línea" : "Desconectado"}
        </p>
      </div>
    </Link>
  );
}
