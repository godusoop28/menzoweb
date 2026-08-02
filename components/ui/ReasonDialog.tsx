"use client";

import { useState } from "react";

type ReasonDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
};

/** Como ConfirmDialog, pero exige escribir un motivo antes de confirmar — usado por toda acción
 * de moderación de staff global (suspender, eliminar cuenta, ocultar/borrar publicación, cambiar
 * rol, etc.), que siempre queda registrada en el log de moderación con ese motivo. */
export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  busy,
  onConfirm,
  onCancel,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  if (!open) return null;

  const canConfirm = reason.trim().length > 0 && !busy;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-2xl">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
        </div>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo (obligatorio)"
          maxLength={300}
          rows={3}
          className="w-full resize-none rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] p-3 text-sm outline-none focus:border-[var(--color-coral)]"
        />
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-full bg-[var(--color-surface-secondary)] py-2.5 text-sm font-semibold disabled:opacity-60 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onConfirm(reason.trim())}
            disabled={!canConfirm}
            className="flex-1 rounded-full bg-[var(--color-coral)] py-2.5 text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
