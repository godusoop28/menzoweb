import Link from "next/link";
import type { ReactNode } from "react";

export const LEGAL_CONTACT_EMAIL = "emy.rodriguezc28@gmail.com";
export const LEGAL_UPDATED_AT = "24 de septiembre de 2026";

/** Páginas legales públicas (sin sesión): privacidad, términos y eliminación de cuenta. Google
 * Play y la App Store piden estas URLs accesibles para cualquiera. */
export function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[var(--color-background)]">
      <header className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-4 py-4 md:px-10">
        <Link href="/" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/menzo-logo.png" alt="Menzo" className="h-8 w-8 rounded-lg" />
          <span className="font-display text-lg font-bold tracking-tight">MENZO</span>
        </Link>
        <nav className="flex gap-4 text-sm text-[var(--color-text-secondary)]">
          <Link href="/privacidad" className="hover:text-[var(--color-orange)]">Privacidad</Link>
          <Link href="/terminos" className="hover:text-[var(--color-orange)]">Términos</Link>
          <Link href="/eliminar-cuenta" className="hover:text-[var(--color-orange)]">Eliminar cuenta</Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-10 md:py-14">
        <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">{title}</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">Última actualización: {LEGAL_UPDATED_AT}</p>
        <div className="legal-prose mt-8 flex flex-col gap-6 text-[15px] leading-relaxed text-[var(--color-text-secondary)]">
          {children}
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
      {children}
    </section>
  );
}
