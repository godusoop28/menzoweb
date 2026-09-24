"use client";

import Link from "next/link";
import { useState } from "react";

import { AuthLayout } from "@/components/AuthLayout";
import { GradientButton } from "@/components/GradientButton";
import { ApiError, authApi } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos conectar con Menzo. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout activeTab={null} title="Recuperar contraseña">
      {sent ? (
        <div className="flex flex-col gap-4 text-sm text-[var(--color-text-secondary)]">
          <p>
            Si <span className="font-semibold text-[var(--color-text-primary)]">{email.trim()}</span> tiene una cuenta en Menzo,
            te enviamos un correo con un enlace para elegir una nueva contraseña. El enlace vence en 30 minutos.
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">¿No llega? Revisa la carpeta de spam o vuelve a intentarlo en unos minutos.</p>
          <Link href="/login" className="font-semibold text-[var(--color-orange)]">
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Escribe el correo de tu cuenta y te mandaremos un enlace para restablecer tu contraseña.
          </p>
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
          {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
          <GradientButton label="Enviar enlace" type="submit" disabled={!valid} loading={submitting} />
        </form>
      )}
    </AuthLayout>
  );
}
