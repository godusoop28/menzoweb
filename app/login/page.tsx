"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GradientButton } from "@/components/GradientButton";
import { ApiError } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";

export default function LoginPage() {
  const { actions } = useAppState();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="flex flex-col gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/branding/menzo-logo.png" alt="Menzo" className="h-12 w-12 rounded-xl" />
        <h1 className="font-display text-3xl font-bold">Bienvenido de vuelta</h1>
        <p className="text-[var(--color-text-secondary)]">Inicia sesión con la cuenta que ya creaste en Menzo.</p>
      </div>

      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-text-muted)]">Correo</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            autoCapitalize="none"
            autoCorrect="off"
            className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-text-muted)]">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tu contraseña"
            className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
          />
        </label>

        {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

        <GradientButton label="Iniciar sesión" type="submit" disabled={!valid} loading={submitting} />
      </form>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        ¿Todavía no tienes cuenta?{" "}
        <Link href="/register" className="font-medium text-[var(--color-cyan)]">
          Crear cuenta
        </Link>
      </p>
    </div>
  );
}
