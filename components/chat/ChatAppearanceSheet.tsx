"use client";

import { useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { ApiError, uploadsApi } from "@/lib/api";
import type { BubbleStyle, ChatAppearancePrefs } from "@/lib/chat/chatAppearance";
import { Colors } from "@/lib/theme";

const BUBBLE_SWATCHES = [Colors.orange, Colors.coral, Colors.purple, Colors.cyan, Colors.blue, Colors.green];

function BubbleStylePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: BubbleStyle;
  onChange: (next: BubbleStyle) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onChange({ mode: "default" })}
          className={`flex h-8 items-center rounded-full border px-3 text-xs font-semibold cursor-pointer ${
            value.mode === "default"
              ? "border-[var(--color-orange)] text-[var(--color-orange)]"
              : "border-[var(--color-border-soft)] text-[var(--color-text-muted)]"
          }`}
        >
          Default
        </button>
        {BUBBLE_SWATCHES.map((color) => (
          <button
            key={color}
            aria-label={`Usar color ${color}`}
            onClick={() => onChange({ mode: "solid", color })}
            className={`h-8 w-8 shrink-0 rounded-full cursor-pointer ${
              value.mode === "solid" && value.color === color ? "ring-2 ring-offset-2 ring-offset-[var(--color-surface)] ring-white" : ""
            }`}
            style={{ background: color }}
          />
        ))}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  formatValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <p className="font-medium">{label}</p>
        <span className="text-xs text-[var(--color-text-muted)]">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-orange)]"
      />
    </div>
  );
}

/** Hoja de apariencia personal de la sala que se está viendo — abierta desde el propio chat
 * (siempre visible, no requiere ser owner/co-host). Escribe únicamente en local storage vía
 * `useChatAppearance`; nunca llama a chatApi/communitiesApi. */
export function ChatAppearanceSheet({
  open,
  onClose,
  prefs,
  onChange,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  prefs: ChatAppearancePrefs;
  onChange: (patch: Partial<ChatAppearancePrefs>) => void;
  onReset: () => void;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleWallpaperUpload(file: File) {
    setUploadError(null);
    try {
      const url = await uploadsApi.upload(file);
      onChange({ wallpaperUrl: url });
    } catch (err) {
      console.warn("[menzo/web] chat wallpaper upload failed", err);
      setUploadError(err instanceof ApiError ? err.message : "No pudimos subir la imagen.");
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Apariencia de este chat"
      subtitle="Solo vos ves estos cambios — nadie más en la sala se entera."
      footer={
        <button
          onClick={onReset}
          className="w-full rounded-full border border-[var(--color-border-soft)] py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] cursor-pointer"
        >
          Restablecer
        </button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Fondo (wallpaper)</p>
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface-secondary)]">
              {prefs.wallpaperUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={prefs.wallpaperUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-[10px] text-[var(--color-text-muted)]">Sin imagen</span>
              )}
            </div>
            <div className="flex flex-1 flex-wrap gap-2">
              <label className="inline-block cursor-pointer rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold">
                Cambiar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleWallpaperUpload(file);
                  }}
                />
              </label>
              {prefs.wallpaperUrl && (
                <button
                  onClick={() => onChange({ wallpaperUrl: undefined })}
                  className="rounded-full border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-text-secondary)] cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </div>
          </div>
          {uploadError && <p className="text-xs text-[var(--color-coral)]">{uploadError}</p>}
        </div>

        <BubbleStylePicker label="Burbuja saliente (tuya)" value={prefs.outgoingBubble} onChange={(v) => onChange({ outgoingBubble: v })} />
        <BubbleStylePicker label="Burbuja entrante" value={prefs.incomingBubble} onChange={(v) => onChange({ incomingBubble: v })} />

        <Slider
          label="Opacidad del fondo"
          value={prefs.wallpaperOpacity}
          min={0.1}
          max={1}
          step={0.05}
          onChange={(v) => onChange({ wallpaperOpacity: v })}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Opacidad de las burbujas"
          value={prefs.bubbleOpacity}
          min={0.3}
          max={1}
          step={0.05}
          onChange={(v) => onChange({ bubbleOpacity: v })}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />
        <Slider
          label="Tamaño del texto"
          value={prefs.textScale}
          min={0.85}
          max={1.3}
          step={0.05}
          onChange={(v) => onChange({ textScale: v })}
          formatValue={(v) => `${Math.round(v * 100)}%`}
        />

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Modo compacto</span>
          <input
            type="checkbox"
            checked={prefs.compactMode}
            onChange={(e) => onChange({ compactMode: e.target.checked })}
            className="h-5 w-5 cursor-pointer accent-[var(--color-orange)]"
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Mostrar avatares</span>
          <input
            type="checkbox"
            checked={prefs.showAvatars}
            onChange={(e) => onChange({ showAvatars: e.target.checked })}
            className="h-5 w-5 cursor-pointer accent-[var(--color-orange)]"
          />
        </label>
      </div>
    </Sheet>
  );
}
