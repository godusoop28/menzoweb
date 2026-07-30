"use client";

import { useEffect } from "react";

import { CloseIcon } from "@/components/icons";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Contenido fijo al pie (p. ej. botones de guardar) — no scrollea con el resto. */
  footer?: React.ReactNode;
  widthClassName?: string;
};

/** Primitivo único de modal/drawer/bottom-sheet para toda la app (antes no existía ninguno —
 * toda la administración vivía en páginas completas). En escritorio se ve como un modal amplio
 * centrado; en pantallas angostas ocupa toda la altura como una hoja que sube desde abajo, con
 * su propio scroll interno para que el header y el footer queden siempre visibles. */
export function Sheet({ open, onClose, title, subtitle, children, footer, widthClassName = "max-w-lg" }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        className={`relative flex w-full ${widthClassName} flex-col overflow-hidden rounded-t-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-2xl md:max-h-[85vh] md:rounded-3xl`}
        style={{ maxHeight: "92dvh" }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display truncate text-lg font-bold">{title}</h2>
            {subtitle && <p className="truncate text-xs text-[var(--color-text-muted)]">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] cursor-pointer"
          >
            <CloseIcon size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="shrink-0 border-t border-[var(--color-border-soft)] px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}
