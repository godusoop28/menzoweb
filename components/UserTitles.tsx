"use client";

import { useState } from "react";

import type { UserTitle } from "@/lib/types";

/** Paleta fija para elegir el color de un título — mismo set que menzomovil
 * (lib/features/shared/user_titles_section.dart/kTitleColorPalette), para que un título se vea
 * igual en ambas plataformas. */
export const TITLE_COLOR_PALETTE = [
  "#FF6B6B",
  "#FF9F43",
  "#FFD93D",
  "#6BCB77",
  "#4ECDC4",
  "#4D96FF",
  "#A78BFA",
  "#F472B6",
  "#94A3B8",
];

/** Contraste texto blanco/negro simple por luminancia — un título con color pastel claro (p.ej.
 * #FFD93D) necesita texto negro, uno oscuro necesita texto blanco. */
function textColorFor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

/** Fila de chips debajo del perfil de un usuario (ver AdminService.addTitle en menzoapi) —
 * siempre visible si hay títulos; el chip "+ Título" y la "x" en cada chip solo aparecen si
 * `canManage` (viewer LEADER+, ver member/[id]/page.tsx y profile/page.tsx). */
export function UserTitles({
  titles,
  canManage,
  onAdd,
  onRemove,
}: {
  titles: UserTitle[];
  canManage: boolean;
  onAdd?: (text: string, color: string) => void;
  onRemove?: (title: UserTitle) => void;
}) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  if (titles.length === 0 && !canManage) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {titles.map((title) => {
        const textColor = textColorFor(title.color);
        return (
          <span
            key={title.id}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold"
            style={{ background: title.color, color: textColor }}
          >
            {title.text}
            {canManage && (
              <button
                onClick={() => onRemove?.(title)}
                aria-label={`Quitar título ${title.text}`}
                title="Quitar título"
                className="cursor-pointer leading-none opacity-80 hover:opacity-100"
                style={{ color: textColor }}
              >
                ×
              </button>
            )}
          </span>
        );
      })}
      {canManage && (
        <button
          onClick={() => setShowAddDialog(true)}
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] cursor-pointer"
        >
          + Título
        </button>
      )}
      {showAddDialog && (
        <AddTitleDialog
          onConfirm={(text, color) => {
            onAdd?.(text, color);
            setShowAddDialog(false);
          }}
          onCancel={() => setShowAddDialog(false)}
        />
      )}
    </div>
  );
}

function AddTitleDialog({
  onConfirm,
  onCancel,
}: {
  onConfirm: (text: string, color: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [color, setColor] = useState(TITLE_COLOR_PALETTE[0]);
  const canConfirm = text.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Nuevo título">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} aria-hidden />
      <div className="relative flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-2xl">
        <h2 className="font-display text-lg font-bold">Nuevo título</h2>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ej: Friendly"
          maxLength={40}
          autoFocus
          className="w-full rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-orange)]"
        />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Color</p>
          <div className="flex flex-wrap gap-2.5">
            {TITLE_COLOR_PALETTE.map((hex) => (
              <button
                key={hex}
                onClick={() => setColor(hex)}
                aria-label={`Elegir color ${hex}`}
                className="h-8 w-8 shrink-0 rounded-full transition-transform cursor-pointer hover:scale-110"
                style={{
                  background: hex,
                  outline: color === hex ? "2.5px solid white" : "none",
                  outlineOffset: 2,
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full bg-[var(--color-surface-secondary)] py-2.5 text-sm font-semibold cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(text.trim(), color)}
            disabled={!canConfirm}
            className="flex-1 rounded-full bg-[var(--color-orange)] py-2.5 text-sm font-bold text-black disabled:opacity-60 cursor-pointer"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
