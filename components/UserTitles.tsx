"use client";

import { useState } from "react";

import type { UserTitle } from "@/lib/types";

function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/** Paleta extensa generada por hue/tono — no un puñado fijo: cubre todo el círculo cromático en
 * dos variantes (vivo y pastel) más una escala de grises, mismo criterio que menzomovil
 * (lib/features/shared/user_titles_section.dart/kTitleColorPalette) para que un título se vea
 * parecido en ambas plataformas. */
const HUES = [0, 20, 40, 60, 90, 120, 150, 180, 200, 220, 250, 280, 300, 330];
export const TITLE_COLOR_PALETTE = [
  ...HUES.map((h) => hsvToHex(h, 0.78, 0.92)),
  ...HUES.map((h) => hsvToHex(h, 0.35, 0.98)),
  ...[0.15, 0.3, 0.45, 0.6, 0.75, 0.9].map((v) => hsvToHex(0, 0, v)),
];

const HEX_RE = /^[0-9A-Fa-f]{6}$/;

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
            className="inline-flex items-center gap-1 rounded-full py-1 pl-2.5 text-xs font-bold"
            style={{ background: title.color, color: textColor, paddingRight: canManage ? 2 : 10 }}
          >
            {title.text}
            {canManage && (
              // Botón con hit target real (28x28), no solo el glifo "×" — un blanco de toque
              // ajustado al carácter era casi imposible de tocar de forma confiable (de ahí el
              // reporte de "no me deja quitarlo": no era un bug de lógica, era el tamaño).
              <button
                onClick={() => onRemove?.(title)}
                aria-label={`Quitar título ${title.text}`}
                title="Quitar título"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base leading-none opacity-80 transition-opacity hover:opacity-100 hover:bg-black/10 cursor-pointer"
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
  const [hexInput, setHexInput] = useState(TITLE_COLOR_PALETTE[0].slice(1));
  const canConfirm = text.trim().length > 0 && HEX_RE.test(hexInput);

  function applyHex(value: string) {
    const cleaned = value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
    setHexInput(cleaned);
    if (HEX_RE.test(cleaned)) setColor(`#${cleaned.toUpperCase()}`);
  }

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
          {/* input type="color" abre el selector nativo del sistema operativo/navegador — en
              Chrome/Edge de escritorio eso incluye un gotero real para tomar cualquier color de
              la pantalla, no solo de esta paleta. El campo de texto hex al lado cubre el otro
              camino pedido: escribir/pegar un código directo. */}
          <div className="mb-3 flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                setColor(e.target.value.toUpperCase());
                setHexInput(e.target.value.slice(1).toUpperCase());
              }}
              aria-label="Elegir cualquier color"
              className="h-10 w-10 shrink-0 cursor-pointer rounded-full border border-[var(--color-border-soft)] bg-transparent p-0 [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0"
            />
            <div className="flex flex-1 items-center gap-1.5 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3 py-2">
              <span className="text-sm text-[var(--color-text-muted)]">#</span>
              <input
                value={hexInput}
                onChange={(e) => applyHex(e.target.value)}
                placeholder="RRGGBB"
                maxLength={6}
                className="w-full bg-transparent font-mono text-sm uppercase outline-none"
              />
            </div>
          </div>
          <div className="grid max-h-40 grid-cols-7 gap-2 overflow-y-auto pr-1">
            {TITLE_COLOR_PALETTE.map((hex) => (
              <button
                key={hex}
                onClick={() => {
                  setColor(hex);
                  setHexInput(hex.slice(1));
                }}
                aria-label={`Elegir color ${hex}`}
                className="aspect-square w-full shrink-0 rounded-full transition-transform cursor-pointer hover:scale-110"
                style={{
                  background: hex,
                  outline: color === hex ? "2.5px solid white" : "1px solid rgba(0,0,0,0.15)",
                  outlineOffset: color === hex ? 2 : -1,
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
