"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { adminApi } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { BackIcon } from "@/components/icons";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import type { ModerationQueueItemDto, ModerationQueueStatus } from "@/lib/api/types";

const TABS: { value: ModerationQueueStatus; label: string }[] = [
  { value: "PENDING", label: "Pendientes" },
  { value: "DISMISSED", label: "Descartados" },
  { value: "ACTIONED", label: "Accionados" },
];

const RISK_STYLES: Record<string, string> = {
  SAFE: "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]",
  WARNING: "bg-yellow-500/15 text-yellow-600",
  REVIEW: "bg-orange-500/15 text-orange-600",
  BLOCK: "bg-red-500/15 text-red-600",
};

type PendingReview = { kind: "dismiss" | "action"; item: ModerationQueueItemDto } | null;

/** Contenido marcado automáticamente por la pipeline de seguridad (FASE A-D de menzoapi) —
 * ver ModerationQueueService. Queda vacío hasta que esa pipeline se conecte a endpoints reales
 * (FASE F): esta pantalla es la parte "admin moderation UI" del plan, lista desde ya para cuando
 * eso pase, sin necesitar ningún cambio acá. */
export default function AdminModerationQueuePage() {
  const { state } = useAppState();
  const router = useRouter();
  const globalRole = state.profile?.globalRole;
  const isLeaderPlus = globalRole === "LEADER" || globalRole === "MASTER";

  const [tab, setTab] = useState<ModerationQueueStatus>("PENDING");
  const [items, setItems] = useState<ModerationQueueItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingReview>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state.isHydrated) return;
    if (!isLeaderPlus) {
      router.replace("/admin");
      return;
    }
    adminApi
      .moderationQueue(0, 30, tab)
      .then((page) => setItems(page.items))
      .catch((error) => console.warn("[menzo/web] moderationQueue failed", error))
      .finally(() => setLoading(false));
  }, [state.isHydrated, isLeaderPlus, router, tab]);

  if (!isLeaderPlus) return null;

  async function confirmReview(note: string) {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "dismiss") {
        await adminApi.dismissModerationQueueItem(pending.item.id, { reason: note });
      } else {
        await adminApi.actionModerationQueueItem(pending.item.id, { reason: note });
      }
      setItems((prev) => prev.filter((it) => it.id !== pending.item.id));
      setPending(null);
    } catch (error) {
      console.warn("[menzo/web] moderation queue review failed", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <a href="/admin" className="text-[var(--color-text-secondary)]">
          <BackIcon />
        </a>
        <h1 className="font-display text-xl font-bold">Cola de moderación</h1>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => {
              setLoading(true);
              setTab(t.value);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold cursor-pointer ${
              tab === t.value
                ? "bg-[var(--color-coral)] text-white"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[var(--color-text-muted)]">Cargando…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">
          Nada acá todavía — la pipeline automática de seguridad aún no está conectada a ningún endpoint.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className={`rounded-full px-2 py-0.5 font-semibold ${RISK_STYLES[item.riskLevel] ?? RISK_STYLES.WARNING}`}>
                {item.riskLevel}
              </span>
              <span className="text-[var(--color-text-muted)]">{item.contentType}</span>
              {item.author && (
                <span className="text-[var(--color-text-secondary)]">· {item.author.displayName}</span>
              )}
              <span className="ml-auto text-[var(--color-text-muted)]">{new Date(item.createdAt).toLocaleString()}</span>
            </div>

            {item.contentSnapshot && (
              <p className="mt-2 whitespace-pre-wrap rounded-lg bg-[var(--color-surface-secondary)] p-2 text-sm">
                {item.contentSnapshot}
              </p>
            )}

            {item.reasons.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-muted)]"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}

            {item.status === "PENDING" ? (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setPending({ kind: "dismiss", item })}
                  className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  Descartar
                </button>
                <button
                  onClick={() => setPending({ kind: "action", item })}
                  className="rounded-full bg-[var(--color-coral)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  Marcar accionado
                </button>
              </div>
            ) : (
              <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                {item.reviewedBy?.displayName} · {item.reviewedAt && new Date(item.reviewedAt).toLocaleString()}
                {item.reviewNote && <p className="mt-1 text-[var(--color-text-secondary)]">{item.reviewNote}</p>}
              </div>
            )}
          </div>
        ))}
      </div>

      <ReasonDialog
        open={!!pending}
        title={pending?.kind === "dismiss" ? "Descartar este elemento" : "Marcar como accionado"}
        description={
          pending?.kind === "dismiss"
            ? "El contenido se revisó y no viola las reglas (falso positivo)."
            : "El contenido violaba las reglas — la acción concreta (borrar/ocultar/suspender) se hace desde Usuarios/Publicaciones."
        }
        confirmLabel="Confirmar"
        busy={busy}
        onConfirm={confirmReview}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
