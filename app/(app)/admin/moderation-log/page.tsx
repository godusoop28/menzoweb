"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { adminApi } from "@/lib/api";
import { mapModerationAction } from "@/lib/api/mappers";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { useAppState } from "@/lib/AppStateContext";
import { BackIcon } from "@/components/icons";
import type { ModerationAction } from "@/lib/types";

export default function AdminModerationLogPage() {
  const { state } = useAppState();
  const router = useRouter();
  const isMaster = state.profile?.globalRole === "MASTER";
  const [items, setItems] = useState<ModerationAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state.isHydrated) return;
    if (!isMaster) {
      router.replace("/admin");
      return;
    }
    adminApi
      .moderationLog()
      .then((page) => setItems(page.items.map((dto) => mapModerationAction(dto, LOCAL_USER_ID))))
      .catch((error) => console.warn("[menzo/web] moderationLog failed", error))
      .finally(() => setLoading(false));
  }, [state.isHydrated, isMaster, router]);

  if (!isMaster) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <a href="/admin" className="text-[var(--color-text-secondary)]">
          <BackIcon />
        </a>
        <h1 className="font-display text-xl font-bold">Log de moderación</h1>
      </div>

      {loading && <p className="text-sm text-[var(--color-text-muted)]">Cargando…</p>}
      {!loading && items.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">Sin actividad todavía.</p>}

      <div className="flex flex-col gap-2">
        {items.map((action) => (
          <div key={action.id} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text-primary)]">{action.actor.displayName}</span>
              <span>{new Date(action.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm">
              <span className="font-semibold">{action.actionType}</span> · {action.targetType}
            </p>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{action.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
