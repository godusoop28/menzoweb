"use client";

import { useState } from "react";

import { ApiError, safetyApi, type ReportReason, type ReportTargetType } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "SPAM", label: "Spam o estafa" },
  { value: "HARASSMENT", label: "Acoso o intimidación" },
  { value: "HATE", label: "Discurso de odio" },
  { value: "SEXUAL", label: "Contenido sexual" },
  { value: "VIOLENCE", label: "Violencia o amenazas" },
  { value: "SELF_HARM", label: "Autolesiones" },
  { value: "IMPERSONATION", label: "Suplantación de identidad" },
  { value: "OTHER", label: "Otro motivo" },
];

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  /** Qué se reporta, en palabras ("esta publicación", "a @usuario") — solo para el título. */
  subject: string;
  onClose: () => void;
};

/** Reporte de contenido/usuario — llega a la cola de moderación que revisa el staff. */
export function ReportDialog({ targetType, targetId, subject, onClose }: Props) {
  const showToast = useToast();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await safetyApi.report(targetType, targetId, reason, details.trim() || undefined);
      showToast("Gracias. El equipo de moderación revisará el reporte.");
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No se pudo enviar el reporte.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 md:items-center"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="font-display text-lg font-semibold">Reportar {subject}</h2>
          <p className="text-xs text-[var(--color-text-muted)]">Nadie más verá quién hizo el reporte.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setReason(r.value)}
              className={`cursor-pointer rounded-xl border px-4 py-2.5 text-left text-sm transition-colors ${
                reason === r.value
                  ? "border-[var(--color-orange)] bg-[var(--color-orange)]/10 text-[var(--color-text-primary)]"
                  : "border-[var(--color-border-soft)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-muted)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 500))}
          placeholder="Detalles (opcional)"
          rows={3}
          className="resize-none rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm outline-none focus:border-[var(--color-orange)]"
        />
        {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="cursor-pointer rounded-full px-4 py-2 text-sm text-[var(--color-text-secondary)]">
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!reason || submitting}
            className="cursor-pointer rounded-full bg-[var(--color-coral)] px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
          >
            {submitting ? "Enviando…" : "Enviar reporte"}
          </button>
        </div>
      </div>
    </div>
  );
}
