"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthLayout } from "@/components/AuthLayout";
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
    <AuthLayout activeTab="register">
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
            className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-orange)]"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-[var(--color-text-muted)]">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            className="rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-orange)]"
          />
        </label>

        {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

        <GradientButton label="Crear cuenta" type="submit" disabled={!valid} loading={submitting} />
      </form>
    </AuthLayout>
  );
}
