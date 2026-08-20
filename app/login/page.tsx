"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { AuthLayout } from "@/components/AuthLayout";
import { GradientButton } from "@/components/GradientButton";
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
    <AuthLayout activeTab="login">
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
    </AuthLayout>
  );
}
