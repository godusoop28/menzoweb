import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-background)] px-4 text-center">
      <span className="font-display text-5xl font-black text-[var(--color-orange)]">404</span>
      <h1 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">No encontramos esta página</h1>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
        Puede que el enlace esté roto o que el contenido ya no exista.
      </p>
      <Link href="/" className="rounded-full bg-[var(--color-orange)] px-5 py-2.5 text-sm font-semibold text-[var(--color-text-on-accent)]">
        Volver al inicio
      </Link>
    </div>
  );
}
