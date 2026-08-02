"use client";

import { useState } from "react";

import { adminApi } from "@/lib/api";
import { mapUserProfile } from "@/lib/api/mappers";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { useAppState } from "@/lib/AppStateContext";
import { Avatar } from "@/components/Avatar";
import { BackIcon } from "@/components/icons";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import type { GlobalRole, UserProfile } from "@/lib/types";

const ASSIGNABLE_ROLES: GlobalRole[] = ["USER", "CURATOR", "LEADER"];

export default function AdminRolesPage() {
  const { state } = useAppState();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<{ user: UserProfile; role: GlobalRole } | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(q: string) {
    setQuery(q);
    setLoading(true);
    try {
      const page = await adminApi.searchUsers(q);
      setResults(page.items.map((dto) => mapUserProfile(dto, LOCAL_USER_ID)));
    } catch (error) {
      console.warn("[menzo/web] admin searchUsers failed", error);
    } finally {
      setLoading(false);
    }
  }

  async function confirm(reason: string) {
    if (!pending) return;
    setBusy(true);
    try {
      const targetId = pending.user.id === LOCAL_USER_ID ? state.profile!.id : pending.user.id;
      await adminApi.changeRole(targetId, { role: pending.role, reason });
      setResults((prev) => prev.map((u) => (u.id === pending.user.id ? { ...u, globalRole: pending.role } : u)));
      setPending(null);
    } catch (error) {
      console.warn("[menzo/web] admin changeRole failed", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <a href="/admin" className="text-[var(--color-text-secondary)]">
          <BackIcon />
        </a>
        <h1 className="font-display text-xl font-bold">Roles</h1>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        MASTER es fijo (una sola cuenta configurada) y nunca se asigna acá.
      </p>

      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Buscar por nombre o usuario…"
        className="w-full rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-coral)]"
      />

      {loading && <p className="text-sm text-[var(--color-text-muted)]">Buscando…</p>}

      <div className="flex flex-col gap-2">
        {results.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3"
          >
            <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.displayName}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">@{user.username}</p>
            </div>
            {user.globalRole === "MASTER" ? (
              <span className="shrink-0 rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold">
                MASTER
              </span>
            ) : (
              <select
                value={user.globalRole}
                onChange={(e) => setPending({ user, role: e.target.value as GlobalRole })}
                className="shrink-0 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold outline-none cursor-pointer"
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
      </div>

      <ReasonDialog
        open={!!pending}
        title={pending ? `Cambiar el rol de ${pending.user.displayName} a ${pending.role}` : ""}
        description="El motivo queda registrado en el log de moderación."
        busy={busy}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
