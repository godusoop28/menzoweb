"use client";

import { useEffect } from "react";

export function Toast({ message, onHide }: { message: string | null; onHide: () => void }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onHide, 3200);
    return () => clearTimeout(timer);
  }, [message, onHide]);

  if (!message) return null;

  return (
    // z-[80]: un toast tiene que quedar SIEMPRE legible, incluso si se dispara mientras hay un
    // Sheet (z-50) o un ConfirmDialog (z-[60]) abiertos — antes compartía z-50 con Sheet, así que
    // un toast disparado con un sheet abierto (p. ej. un error al moderar a alguien desde
    // RoomSettingsPanel) podía quedar tapado por el propio sheet según el orden del DOM.
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[80] flex justify-center px-4 md:bottom-6">
      <div className="menzo-fade-in pointer-events-auto rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-4 py-2.5 text-sm font-medium shadow-xl">
        {message}
      </div>
    </div>
  );
}
