"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { AuthLayout } from "@/components/AuthLayout";
import { GradientButton } from "@/components/GradientButton";
import { ApiError, authApi } from "@/lib/api";

const INPUT_CLASS =
  "rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-[var(--color-text-primary)] outline-none transition-colors focus:border-[var(--color-orange)]";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;
  const valid = token.length > 0 && password.length >= 8 && password.length <= 72 && confirm === password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos conectar con Menzo. Inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="flex flex-col gap-4 text-sm text-[var(--color-text-secondary)]">
        <p>Este enlace no es válido. Pide uno nuevo desde “¿Olvidaste tu contraseña?”.</p>
        <Link href="/forgot-password" className="font-semibold text-[var(--color-orange)]">
          Pedir un enlace nuevo
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4 text-sm text-[var(--color-text-secondary)]">
        <p>Listo, tu contraseña se cambió. Por seguridad cerramos las sesiones abiertas en otros dispositivos.</p>
        <Link href="/login" className="font-semibold text-[var(--color-orange)]">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--color-text-muted)]">Nueva contraseña</span>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className={INPUT_CLASS} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-[var(--color-text-muted)]">Repite la contraseña</span>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT_CLASS} />
      </label>
      {tooShort && <p className="text-xs text-[var(--color-coral)]">Usa al menos 8 caracteres.</p>}
      {mismatch && <p className="text-xs text-[var(--color-coral)]">Las contraseñas no coinciden.</p>}
      {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
      <GradientButton label="Guardar contraseña" type="submit" disabled={!valid} loading={submitting} />
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthLayout activeTab={null} title="Elige una nueva contraseña">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
