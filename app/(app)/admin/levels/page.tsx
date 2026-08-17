"use client";

import { useEffect, useState } from "react";

import { BackIcon } from "@/components/icons";
import { adminApi, ApiError } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { LevelDefinitionDto } from "@/lib/api/types";

/** LEADER+ (ver AdminAuthorizationService.requireLeader en menzoapi) — renombra los 20 niveles
 * del sistema de XP por tiempo activo. Nunca crea ni borra niveles, solo el nombre. */
export default function AdminLevelsPage() {
  const showToast = useToast();
  const [levels, setLevels] = useState<LevelDefinitionDto[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingLevel, setSavingLevel] = useState<number | null>(null);

  useEffect(() => {
    adminApi
      .listLevels()
      .then((items) => {
        setLevels(items);
        setDrafts(Object.fromEntries(items.map((l) => [l.level, l.name])));
      })
      .catch((error) => {
        console.warn("[menzo/web] listLevels failed", error);
        showToast(error instanceof ApiError ? error.message : "No pudimos cargar los niveles.");
        setLevels([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(level: number) {
    const name = drafts[level]?.trim();
    if (!name) return;
    setSavingLevel(level);
    try {
      const updated = await adminApi.renameLevel(level, name);
      setLevels((prev) => prev?.map((l) => (l.level === level ? updated : l)) ?? prev);
      showToast(`Nivel ${level} renombrado.`);
    } catch (error) {
      console.warn("[menzo/web] renameLevel failed", error);
      showToast(error instanceof ApiError ? error.message : "No pudimos guardar el nombre.");
    } finally {
      setSavingLevel(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <a href="/admin" className="text-[var(--color-text-secondary)]">
          <BackIcon />
        </a>
        <h1 className="font-display text-xl font-bold">Niveles</h1>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        Los usuarios suben de nivel con el tiempo que pasan activos en la app (máximo nivel 20, cada vez más difícil). Acá
        solo se edita el nombre de cada nivel, no el umbral de XP.
      </p>

      {levels === null && <p className="text-sm text-[var(--color-text-muted)]">Cargando…</p>}

      <div className="flex flex-col gap-2">
        {levels?.map((l) => {
          const dirty = drafts[l.level] !== l.name;
          return (
            <div
              key={l.level}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-yellow)]/10 text-xs font-bold text-[var(--color-yellow)]">
                {l.level}
              </span>
              <input
                value={drafts[l.level] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [l.level]: e.target.value }))}
                maxLength={40}
                className="min-w-0 flex-1 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3 py-1.5 text-sm outline-none focus:border-[var(--color-coral)]"
              />
              <button
                onClick={() => save(l.level)}
                disabled={!dirty || savingLevel === l.level}
                className="shrink-0 rounded-full bg-[var(--color-coral)] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
              >
                {savingLevel === l.level ? "Guardando…" : "Guardar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
