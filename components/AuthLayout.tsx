import Link from "next/link";
import type { ReactNode } from "react";

const TAB_ACTIVE = "border-b-2 border-[var(--color-orange)] pb-3 -mb-3 text-[var(--color-orange)]";
const TAB_INACTIVE = "pb-3 -mb-3 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]";

/**
 * Layout compartido de /login y /register — antes cada página tenía su propia card angosta
 * centrada (pensada para móvil) sin nada visible en escritorio salvo el fondo liso de body. La
 * referencia (diseñoWeb/) pide una pantalla completa "cinematográfica" en escritorio: fondo a
 * pantalla completa, topbar con logo + link a la otra acción, wordmark grande, card con tabs.
 *
 * Reutiliza el mismo asset que ya usaba ScreenBackground en estas pantallas
 * (background-onboarding.png) en vez de inventar un arte nuevo — ver Contexto §21 del pedido
 * ("no establecer una imagen de ejemplo... la interfaz debe tomar las URLs de la API"): esta
 * imagen no viene de la API en ningún caso (es puramente decorativa, sin datos), así que no aplica
 * ese criterio, pero tampoco hay que sumar un asset de marca nuevo sin que el usuario lo provea.
 * object-cover centrado funciona bien acá porque el centro de esta imagen es oscuro/vacío (a
 * diferencia de fondos personales con texto/caras, el caso que ScreenBackground documenta que
 * rompe en desktop).
 */
export function AuthLayout({ activeTab, children }: { activeTab: "login" | "register"; children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[var(--color-background)]">
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/backgrounds/background-onboarding.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-[rgba(7,9,13,0.72)] md:bg-[rgba(7,9,13,0.55)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,9,13,0.92)] via-[rgba(7,9,13,0.25)] to-[rgba(7,9,13,0.45)]" />
      </div>

      <div className="relative z-10 flex min-h-screen w-full flex-col">
        <div className="flex items-center justify-between px-6 py-5 md:px-10 md:py-6">
          <Link href="/login" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/menzo-logo.png" alt="Menzo" className="h-8 w-8 rounded-lg" />
            <span className="font-display text-lg font-bold tracking-tight">MENZO</span>
          </Link>
          <p className="text-sm text-[var(--color-text-secondary)]">
            {activeTab === "login" ? (
              <>
                ¿No tienes cuenta?{" "}
                <Link href="/register" className="font-semibold text-[var(--color-orange)]">
                  Crear cuenta
                </Link>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="font-semibold text-[var(--color-orange)]">
                  Iniciar sesión
                </Link>
              </>
            )}
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-7 px-6 py-8 md:py-12">
          <div className="menzo-fade-in flex flex-col items-center gap-2 text-center">
            <div className="relative flex items-center justify-center">
              <div
                className="absolute h-40 w-40 rounded-full blur-2xl"
                style={{ background: "radial-gradient(circle, rgba(255,122,26,0.45), rgba(139,92,246,0.2), transparent 70%)" }}
              />
              <span className="relative font-display text-4xl font-black tracking-wide text-[var(--color-orange)]">MENZO</span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">Tu mundo. Tu comunidad.</p>
          </div>

          <div className="menzo-fade-in flex flex-col gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]/85 p-6 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-6 border-b border-[var(--color-border-soft)] pb-3 text-sm font-semibold">
              <Link href="/login" className={activeTab === "login" ? TAB_ACTIVE : TAB_INACTIVE}>
                Iniciar sesión
              </Link>
              <Link href="/register" className={activeTab === "register" ? TAB_ACTIVE : TAB_INACTIVE}>
                Crear cuenta
              </Link>
            </div>
            {children}
          </div>

          <p className="menzo-fade-in text-center text-sm text-[var(--color-text-muted)]">
            Comunidades que comparten tu pasión.
            <br />
            Chats en vivo, blogs, perfiles y mucho más.
          </p>
        </div>
      </div>
    </div>
  );
}
