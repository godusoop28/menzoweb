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
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-6">
      <div className="menzo-fade-in pointer-events-auto rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-4 py-2.5 text-sm font-medium shadow-xl">
        {message}
      </div>
    </div>
  );
}
