"use client";

import { useEffect, useRef, useState } from "react";

/** Selector de color tipo rueda (matiz/saturación en círculo, arrastrando con el dedo o el mouse
 * como pidió el usuario) + una barra de brillo aparte + un campo de hex para precisión — sin
 * dependencias nuevas, es un &lt;canvas&gt; con la matemática HSV↔RGB estándar. Reemplaza los
 * `type="color"` nativos y los swatch grids fijos que había en comunidad/perfil/burbuja de chat.
 * Controlado: `value` siempre gana sobre el estado interno (mismo patrón que un &lt;input&gt;
 * controlado de React). */
export function ColorWheelPicker({
  value,
  onChange,
  size = 176,
}: {
  /** Hex de 6 dígitos, con o sin "#". */
  value: string;
  onChange: (hex: string) => void;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);
  const [hexInput, setHexInput] = useState(normalizeHex(value));
  // "Ajustar estado cuando cambia una prop" durante el render, no en un efecto (evita el
  // round-trip extra de re-render que dispara el warning de setState síncrono en useEffect) — ver
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setHexInput(normalizeHex(value));
  }

  const hsv = hexToHsv(value) ?? { h: 20, s: 0.85, v: 1 };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    // putImageData escribe en pixeles fisicos crudos y ignora ctx.scale — hay que generar la
    // imagen ya al tamano fisico (size*dpr) en vez de escalar el contexto, si no en pantallas
    // Retina (iPad, la mayoria de celulares y notebooks modernas) la rueda queda pintada solo
    // en el cuadrante superior izquierdo del canvas y el resto se ve vacio/roto.
    const physicalSize = Math.round(size * dpr);
    canvas.width = physicalSize;
    canvas.height = physicalSize;

    const radius = physicalSize / 2;
    const image = ctx.createImageData(physicalSize, physicalSize);
    for (let y = 0; y < physicalSize; y++) {
      for (let x = 0; x < physicalSize; x++) {
        const dx = x - radius;
        const dy = y - radius;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * physicalSize + x) * 4;
        if (dist > radius) {
          image.data[idx + 3] = 0;
          continue;
        }
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 180;
        const sat = Math.min(1, dist / radius);
        const [r, g, b] = hsvToRgb(angle, sat, 1);
        image.data[idx] = r;
        image.data[idx + 1] = g;
        image.data[idx + 2] = b;
        image.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
  }, [size]);

  function handlePointer(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const radius = size / 2;
    const dx = clientX - rect.left - radius;
    const dy = clientY - rect.top - radius;
    const dist = Math.min(radius, Math.sqrt(dx * dx + dy * dy));
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 180;
    const sat = radius === 0 ? 0 : dist / radius;
    onChange(rgbToHex(...hsvToRgb(angle, sat, hsv.v)));
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative touch-none select-none"
        style={{ width: size, height: size }}
        onPointerDown={(e) => {
          draggingRef.current = true;
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          handlePointer(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) handlePointer(e.clientX, e.clientY);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
      >
        <canvas ref={canvasRef} style={{ width: size, height: size, borderRadius: "9999px" }} className="shadow-inner" />
        <PickerDot size={size} hsv={hsv} />
      </div>

      <label className="flex w-full flex-col gap-1">
        <span className="text-[11px] font-medium text-[var(--color-text-muted)]">Brillo</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(hsv.v * 100)}
          onChange={(e) => onChange(rgbToHex(...hsvToRgb(hsv.h, hsv.s, Number(e.target.value) / 100)))}
          className="w-full accent-[var(--color-orange)]"
          style={{
            background: `linear-gradient(90deg, #000, ${rgbToHex(...hsvToRgb(hsv.h, hsv.s, 1))})`,
          }}
        />
      </label>

      <div className="flex w-full items-center gap-2">
        <span
          className="h-7 w-7 shrink-0 rounded-full border border-[var(--color-border-soft)]"
          style={{ background: normalizeHex(value) }}
          aria-hidden
        />
        <input
          value={hexInput}
          onChange={(e) => {
            const next = e.target.value;
            setHexInput(next);
            const parsed = hexToHsv(next);
            if (parsed) onChange(normalizeHex(next));
          }}
          placeholder="#FF7A1A"
          maxLength={7}
          className="w-full rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-[var(--color-orange)]"
        />
      </div>
    </div>
  );
}

function PickerDot({ size, hsv }: { size: number; hsv: { h: number; s: number; v: number } }) {
  const radius = size / 2;
  const rad = ((hsv.h - 180) * Math.PI) / 180;
  const dist = hsv.s * radius;
  const x = radius + Math.cos(rad) * dist;
  const y = radius + Math.sin(rad) * dist;
  const [r, g, b] = hsvToRgb(hsv.h, hsv.s, hsv.v);
  return (
    <div
      className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
      style={{ left: x, top: y, background: rgbToHex(r, g, b) }}
    />
  );
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function hexToHsv(hex: string): { h: number; s: number; v: number } | null {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;
  if (delta !== 0) {
    if (max === r) h = 60 * (((g - b) / delta) % 6);
    else if (max === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) h += 360;
  const s = max === 0 ? 0 : delta / max;
  return { h, s, v: max };
}

function normalizeHex(value: string): string {
  const clean = value.trim().replace(/^#/, "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(clean) ? `#${clean}` : "#FF7A1A";
}
