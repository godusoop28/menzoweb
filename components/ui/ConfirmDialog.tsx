"use client";

import Image from "next/image";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  danger?: boolean;
  /** Ilustración opcional de acompañamiento (p. ej. Menzi antes de iniciar un LIVE) — decorativa,
   * nunca reemplaza el título/descripción reales del diálogo. */
  image?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Confirmación liviana para acciones puntuales (iniciar LIVE, etc.) — no lleva pestañas ni
 * formularios, para no dar la sensación de que hace falta "llenar algo" antes de continuar. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  busy,
  danger,
  image,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-2xl">
        {image && (
          <Image src={image} alt="" width={640} height={640} className="mx-auto h-16 w-16 object-contain" />
        )}
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {description && <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-full bg-[var(--color-surface-secondary)] py-2.5 text-sm font-semibold disabled:opacity-60 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{ background: danger ? "var(--color-coral)" : "var(--color-coral)" }}
            className="flex-1 rounded-full py-2.5 text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
          >
            {busy ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
