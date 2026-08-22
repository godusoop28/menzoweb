import { ColorWheelPicker } from "@/components/ui/ColorWheelPicker";
import { QUICK_COLORS } from "@/lib/whiteboard/canvasDrawing";
import type { WhiteboardToolKind } from "@/lib/realtime/useWhiteboardSocket";

/** Mismos controles que menzomovil/whiteboard_toolbar.dart — pincel/borrador, color rápido +
 * rueda completa (reusa ColorWheelPicker tal cual, mismo picker que perfil/mascota), grosor,
 * deshacer y (solo moderador+) limpiar. */
export function WhiteboardToolbar({
  tool,
  color,
  width,
  canClear,
  onToolChange,
  onColorChange,
  onWidthChange,
  onUndo,
  onClear,
}: {
  tool: WhiteboardToolKind;
  color: string;
  width: number;
  canClear: boolean;
  onToolChange: (tool: WhiteboardToolKind) => void;
  onColorChange: (color: string) => void;
  onWidthChange: (width: number) => void;
  onUndo: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onToolChange("pen")}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border cursor-pointer ${
            tool === "pen" ? "border-[var(--color-orange)] bg-[var(--color-orange)]/15" : "border-[var(--color-border-soft)]"
          }`}
          aria-label="Pincel"
        >
          ✏️
        </button>
        <button
          type="button"
          onClick={() => onToolChange("eraser")}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border cursor-pointer ${
            tool === "eraser" ? "border-[var(--color-orange)] bg-[var(--color-orange)]/15" : "border-[var(--color-border-soft)]"
          }`}
          aria-label="Borrador"
        >
          🧽
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {QUICK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColorChange(c)}
              className={`h-7 w-7 shrink-0 rounded-full border-2 cursor-pointer ${
                color.toUpperCase() === c ? "border-[var(--color-orange)]" : "border-[var(--color-border-soft)]"
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
          <ColorPopover color={color} onChange={onColorChange} />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-medium cursor-pointer hover:border-[var(--color-border-strong)]"
          >
            Deshacer
          </button>
          {canClear && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg border border-[var(--color-coral)] px-3 py-1.5 text-xs font-medium text-[var(--color-coral)] cursor-pointer"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">Grosor</span>
        <input
          type="range"
          min={2}
          max={32}
          value={width}
          onChange={(e) => onWidthChange(Number(e.target.value))}
          className="w-full accent-[var(--color-orange)]"
        />
      </div>
    </div>
  );
}

/** Exportado para reusarlo también en DrawingCanvas.tsx (mini-lienzo de un post tipo "Dibujo"). */
export function ColorPopover({ color, onChange }: { color: string; onChange: (color: string) => void }) {
  return (
    <details className="relative shrink-0">
      <summary className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--color-border-soft)] text-xs">
        🎨
      </summary>
      <div className="absolute bottom-full right-0 z-10 mb-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background)] p-3 shadow-lg">
        <ColorWheelPicker value={color} onChange={onChange} size={160} />
      </div>
    </details>
  );
}
