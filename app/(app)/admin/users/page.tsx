"use client";

import { useState } from "react";

import { adminApi } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { Avatar } from "@/components/Avatar";
import { BackIcon } from "@/components/icons";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import type { UserProfile } from "@/lib/types";
import { mapUserProfile } from "@/lib/api/mappers";
import { LOCAL_USER_ID } from "@/lib/store/localUser";

type PendingAction =
  | { kind: "suspend" | "unsuspend" | "delete"; user: UserProfile }
  | null;

export default function AdminUsersPage() {
  const { state } = useAppState();
  const isMaster = state.profile?.globalRole === "MASTER";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
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

  async function confirmAction(reason: string) {
    if (!pending) return;
    setBusy(true);
    try {
      const targetId = pending.user.id === LOCAL_USER_ID ? state.profile!.id : pending.user.id;
      if (pending.kind === "suspend") {
        await adminApi.suspendUser(targetId, { reason });
      } else if (pending.kind === "unsuspend") {
        await adminApi.unsuspendUser(targetId, { reason });
      } else {
        await adminApi.deleteAccount(targetId, { reason });
        setResults((prev) => prev.filter((u) => u.id !== pending.user.id));
        setPending(null);
        setBusy(false);
        return;
      }
      setPending(null);
    } catch (error) {
      console.warn("[menzo/web] admin user action failed", error);
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
        <h1 className="font-display text-xl font-bold">Usuarios</h1>
      </div>

      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Buscar por nombre o usuario…"
        className="w-full rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-coral)]"
      />

      {loading && <p className="text-sm text-[var(--color-text-muted)]">Buscando…</p>}
      {!loading && query && results.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">Sin resultados.</p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3"
          >
            <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user.displayName}</p>
              <p className="truncate text-xs text-[var(--color-text-muted)]">
                @{user.username} · {user.globalRole}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setPending({ kind: "suspend", user })}
                className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Suspender
              </button>
              <button
                onClick={() => setPending({ kind: "unsuspend", user })}
                className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Reactivar
              </button>
              {isMaster && (
                <button
                  onClick={() => setPending({ kind: "delete", user })}
                  className="rounded-full bg-[var(--color-coral)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ReasonDialog
        open={!!pending}
        title={
          pending?.kind === "delete"
            ? `Eliminar la cuenta de ${pending.user.displayName}`
            : pending?.kind === "suspend"
              ? `Suspender a ${pending?.user.displayName}`
              : `Reactivar a ${pending?.user.displayName}`
        }
        description={
          pending?.kind === "delete"
            ? "Esta acción es permanente: la cuenta queda inutilizable y sus datos personales se anonimizan. Sus publicaciones y mensajes en salas públicas siguen visibles."
            : "El motivo queda registrado en el log de moderación, visible para el usuario maestro."
        }
        confirmLabel={pending?.kind === "delete" ? "Eliminar" : "Confirmar"}
        busy={busy}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
