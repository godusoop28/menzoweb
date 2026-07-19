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
          : "flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 hover:bg-[var(--color-surface-secondary)]"
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
