"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GradientButton } from "@/components/GradientButton";
import { ScreenBackground } from "@/components/ScreenBackground";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { ApiError } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";

export default function LoginPage() {
  const { actions } = useAppState();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = email.trim().length > 3 && password.length > 0;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const onboardingCompleted = await actions.login(email.trim().toLowerCase(), password);
      router.replace(onboardingCompleted ? "/" : "/onboarding/name");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError("Correo o contraseña incorrectos.");
      } else if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError("No pudimos conectar con Menzo. Revisa tu conexión e inténtalo de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenBackground src="/backgrounds/background-onboarding.png" overlay={0.62}>
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-8 px-6 py-12">
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

        <form
          onSubmit={handleLogin}
          className="menzo-fade-in flex flex-col gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]/80 p-6 backdrop-blur-md shadow-2xl"
        >
          <div className="flex items-center gap-6 border-b border-[var(--color-border-soft)] pb-3 text-sm font-semibold">
            <span className="border-b-2 border-[var(--color-orange)] pb-3 -mb-3 text-[var(--color-orange)]">Iniciar sesión</span>
            <Link href="/register" className="pb-3 -mb-3 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]">
              Crear cuenta
            </Link>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-text-muted)]">Correo o usuario</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              autoCapitalize="none"
              autoCorrect="off"
              className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-orange)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-[var(--color-text-muted)]">Contraseña</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                className="w-full rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 pr-11 text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-orange)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] cursor-pointer"
              >
                {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </label>

          {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

          <GradientButton label="Entrar" type="submit" disabled={!valid} loading={submitting} />
        </form>

        <p className="menzo-fade-in text-center text-sm text-[var(--color-text-muted)]">
          Comunidades que comparten tu pasión.
          <br />
          Chats en vivo, blogs, perfiles y mucho más.
        </p>
      </div>
    </ScreenBackground>
  );
}
