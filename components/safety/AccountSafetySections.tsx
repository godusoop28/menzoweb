"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { ApiError, safetyApi, type UserSummaryDto } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import type { GradientId } from "@/lib/theme";
import { useToast } from "@/lib/ToastContext";

const SECTION_TITLE = "text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide";

export function BlockedUsersSection() {
  const showToast = useToast();
  const [blocked, setBlocked] = useState<UserSummaryDto[] | null>(null);

  useEffect(() => {
    safetyApi
      .blocked()
      .then(setBlocked)
      .catch(() => setBlocked([]));
  }, []);

  async function unblock(user: UserSummaryDto) {
    try {
      await safetyApi.unblock(user.id);
      setBlocked((prev) => (prev ?? []).filter((u) => u.id !== user.id));
      showToast(`Desbloqueaste a @${user.username}`);
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "No se pudo desbloquear.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className={SECTION_TITLE}>Usuarios bloqueados</h2>
      {blocked === null ? (
        <p className="text-xs text-[var(--color-text-muted)]">Cargando…</p>
      ) : blocked.length === 0 ? (
        <p className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-xs text-[var(--color-text-muted)]">
          No bloqueaste a nadie. Puedes bloquear a alguien desde su perfil.
        </p>
      ) : (
        blocked.map((user) => (
          <div
            key={user.id}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3"
          >
            <Avatar
              name={user.displayName}
              avatarUri={user.avatarUri ?? undefined}
              gradient={(user.avatarGradient ?? "fire") as GradientId}
              size={36}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user.displayName}</span>
              <span className="block truncate text-xs text-[var(--color-text-muted)]">@{user.username}</span>
            </span>
            <button
              type="button"
              onClick={() => unblock(user)}
              className="cursor-pointer rounded-full border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold"
            >
              Desbloquear
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export function DeleteAccountSection() {
  const { actions } = useAppState();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete() {
    if (!password || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await safetyApi.deleteAccount(password);
      await actions.logout();
      router.replace("/login");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo eliminar la cuenta. Inténtalo de nuevo.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className={SECTION_TITLE}>Zona de peligro</h2>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-xl border border-[var(--color-coral)]/40 bg-[var(--color-surface)] p-4 text-left text-sm font-medium text-[var(--color-coral)]"
        >
          Eliminar mi cuenta
        </button>
      ) : (
        <div className="flex flex-col gap-3 rounded-xl border border-[var(--color-coral)]/40 bg-[var(--color-surface)] p-4 text-sm">
          <p className="font-semibold text-[var(--color-coral)]">Eliminar tu cuenta es permanente</p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Se borran tus datos de perfil, se ocultan tus publicaciones y se cierran todas tus sesiones. No se puede
            deshacer. <Link href="/eliminar-cuenta" className="text-[var(--color-orange)]">Más detalles</Link>
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Escribe tu contraseña para confirmar"
            className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 outline-none focus:border-[var(--color-coral)]"
          />
          {!!error && <p className="text-xs text-[var(--color-coral)]">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setError(null);
              }}
              className="cursor-pointer rounded-full px-4 py-2 text-sm text-[var(--color-text-secondary)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmDelete}
              disabled={!password || submitting}
              className="cursor-pointer rounded-full bg-[var(--color-coral)] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              {submitting ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LegalLinksSection() {
  return (
    <div className="flex flex-col gap-2">
      <h2 className={SECTION_TITLE}>Legal</h2>
      <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] text-sm">
        <Link href="/privacidad" className="border-b border-[var(--color-border-soft)] p-4 font-medium">
          Política de privacidad
        </Link>
        <Link href="/terminos" className="p-4 font-medium">
          Términos y normas de la comunidad
        </Link>
      </div>
    </div>
  );
}
