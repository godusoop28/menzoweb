"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-background)] px-4 text-center">
      <h1 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">Algo salió mal</h1>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
        Tuvimos un problema al mostrar esta pantalla. Puedes intentarlo de nuevo.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="cursor-pointer rounded-full bg-[var(--color-orange)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-on-accent)]"
        >
          Reintentar
        </button>
        <Link href="/" className="rounded-full border border-[var(--color-border-soft)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-primary)]">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
