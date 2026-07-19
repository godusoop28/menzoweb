"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GradientButton } from "@/components/GradientButton";
import { ApiError } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterPage() {
  const { actions } = useAppState();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailValid = EMAIL_PATTERN.test(email.trim());
  const passwordValid = password.length >= 8;
  const valid = emailValid && passwordValid;

  async function handleContinue(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await actions.register(email.trim().toLowerCase(), password);
      router.push("/onboarding/name");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setError("Ese correo ya tiene una cuenta. Inicia sesión en su lugar.");
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
        <h1 className="font-display text-3xl font-bold">Crea tu cuenta</h1>
        <p className="text-[var(--color-text-secondary)]">La necesitas para guardar tu perfil y volver a entrar después.</p>
      </div>

      <form onSubmit={handleContinue} className="flex flex-col gap-4">
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
            placeholder="Mínimo 8 caracteres"
            className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-border-strong)]"
          />
        </label>

        {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

        <GradientButton label="Continuar" type="submit" disabled={!valid} loading={submitting} />
      </form>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-medium text-[var(--color-cyan)]">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
