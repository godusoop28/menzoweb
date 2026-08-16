"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { adminApi } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { BackIcon } from "@/components/icons";
import type { SecurityAuditLogDto } from "@/lib/api/types";

/** Registro insert-only de eventos automáticos de la pipeline de seguridad (rate limit, spam,
 * subidas rechazadas, imágenes flaggeadas, etc.) — ver SecurityAuditService en menzoapi. Vacío
 * hasta FASE F, igual que la cola de moderación. MASTER-only, mismo criterio que /moderation-log. */
export default function AdminSecurityAuditLogPage() {
  const { state } = useAppState();
  const router = useRouter();
  const isMaster = state.profile?.globalRole === "MASTER";
  const [items, setItems] = useState<SecurityAuditLogDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!state.isHydrated) return;
    if (!isMaster) {
      router.replace("/admin");
      return;
    }
    adminApi
      .securityAuditLog()
      .then((page) => setItems(page.items))
      .catch((error) => console.warn("[menzo/web] securityAuditLog failed", error))
      .finally(() => setLoading(false));
  }, [state.isHydrated, isMaster, router]);

  if (!isMaster) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <a href="/admin" className="text-[var(--color-text-secondary)]">
          <BackIcon />
        </a>
        <h1 className="font-display text-xl font-bold">Registro de seguridad</h1>
      </div>

      {loading && <p className="text-sm text-[var(--color-text-muted)]">Cargando…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Sin eventos todavía — la pipeline automática de seguridad aún no está conectada a ningún endpoint.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {items.map((event) => (
          <div key={event.id} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3">
            <div className="flex items-center justify-between gap-2 text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text-primary)]">{event.eventType}</span>
              <span>{new Date(event.createdAt).toLocaleString()}</span>
            </div>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              {event.subject ? event.subject.displayName : "Sin usuario asociado"}
              {event.contentType && ` · ${event.contentType}`}
              {event.riskLevel && ` · ${event.riskLevel}`}
            </p>
            {event.reasons.length > 0 && (
              <p className="mt-1 text-xs text-[var(--color-text-muted)]">{event.reasons.join(", ")}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
