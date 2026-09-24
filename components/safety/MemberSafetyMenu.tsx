"use client";

import { useEffect, useRef, useState } from "react";

import { ApiError, safetyApi } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";

import { ReportDialog } from "./ReportDialog";

/** Menú "⋯" del perfil de otra persona: reportar y bloquear/desbloquear. */
export function MemberSafetyMenu({ userId, username }: { userId: string; username: string }) {
  const showToast = useToast();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    safetyApi
      .blocked()
      .then((list) => {
        if (!cancelled) setBlocked(list.some((u) => u.id === userId));
      })
      .catch(() => {
        if (!cancelled) setBlocked(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function toggleBlock() {
    try {
      if (blocked) {
        await safetyApi.unblock(userId);
        setBlocked(false);
        showToast(`Desbloqueaste a @${username}`);
      } else {
        await safetyApi.block(userId);
        setBlocked(true);
        showToast(`Bloqueaste a @${username}. Ya no verás sus publicaciones ni podrá escribirte.`);
      }
    } catch (e) {
      showToast(e instanceof ApiError ? e.message : "No se pudo completar la acción.");
    } finally {
      setConfirmBlock(false);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-label="Más opciones"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border-strong)] text-lg leading-none"
      >
        ⋯
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 flex w-56 flex-col overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] text-sm shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setReporting(true);
            }}
            className="cursor-pointer px-4 py-3 text-left hover:bg-[var(--color-surface-soft)]"
          >
            Reportar perfil
          </button>
          {confirmBlock ? (
            <div className="flex flex-col gap-2 border-t border-[var(--color-border-soft)] p-3">
              <p className="text-xs text-[var(--color-text-secondary)]">
                @{username} no podrá seguirte, escribirte ni escribir en tu muro, y dejarás de ver sus publicaciones.
              </p>
              <button
                type="button"
                onClick={toggleBlock}
                className="cursor-pointer rounded-full bg-[var(--color-coral)] px-3 py-1.5 text-xs font-semibold text-white"
              >
                Bloquear
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={blocked === null}
              onClick={() => (blocked ? toggleBlock() : setConfirmBlock(true))}
              className="cursor-pointer border-t border-[var(--color-border-soft)] px-4 py-3 text-left text-[var(--color-coral)] hover:bg-[var(--color-surface-soft)] disabled:opacity-50"
            >
              {blocked ? "Desbloquear" : "Bloquear"}
            </button>
          )}
        </div>
      )}
      {reporting && (
        <ReportDialog targetType="USER" targetId={userId} subject={`a @${username}`} onClose={() => setReporting(false)} />
      )}
    </div>
  );
}
