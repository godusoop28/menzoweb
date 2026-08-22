import { EditIcon, EraserIcon, PaletteIcon, PanToolIcon } from "@/components/icons";
import { ColorWheelPicker } from "@/components/ui/ColorWheelPicker";
import { QUICK_COLORS } from "@/lib/whiteboard/canvasDrawing";
import type { WhiteboardToolKind } from "@/lib/realtime/useWhiteboardSocket";

/** Mismos controles que menzomovil/whiteboard_toolbar.dart — pincel/borrador/mover, color rápido
 * + rueda completa (reusa ColorWheelPicker tal cual, mismo picker que perfil/mascota), grosor,
 * deshacer y (solo moderador+) limpiar. Íconos reales (EditIcon/EraserIcon/PaletteIcon), no
 * emojis — antes usaba ✏️/🧽/🎨 directo como glyphs. */
export function WhiteboardToolbar({
  tool,
  moveMode,
  color,
  width,
  canClear,
  onToolChange,
  onSelectMove,
  onColorChange,
  onWidthChange,
  onUndo,
  onClear,
}: {
  tool: WhiteboardToolKind;
  /** true mientras la herramienta "Mover" está activa — independiente de `tool` (pen/eraser
   * siguen siendo lo que se usa la próxima vez que se sale de "Mover"). */
  moveMode: boolean;
  color: string;
  width: number;
  canClear: boolean;
  onToolChange: (tool: WhiteboardToolKind) => void;
  onSelectMove: () => void;
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
            !moveMode && tool === "pen" ? "border-[var(--color-orange)] bg-[var(--color-orange)]/15 text-[var(--color-orange)]" : "border-[var(--color-border-soft)] text-[var(--color-text-secondary)]"
          }`}
          aria-label="Pincel"
        >
          <EditIcon size={17} />
        </button>
        <button
          type="button"
          onClick={() => onToolChange("eraser")}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border cursor-pointer ${
            !moveMode && tool === "eraser" ? "border-[var(--color-orange)] bg-[var(--color-orange)]/15 text-[var(--color-orange)]" : "border-[var(--color-border-soft)] text-[var(--color-text-secondary)]"
          }`}
          aria-label="Borrador"
        >
          <EraserIcon size={17} />
        </button>
        <button
          type="button"
          onClick={onSelectMove}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border cursor-pointer ${
            moveMode ? "border-[var(--color-orange)] bg-[var(--color-orange)]/15 text-[var(--color-orange)]" : "border-[var(--color-border-soft)] text-[var(--color-text-secondary)]"
          }`}
          aria-label="Mover"
        >
          <PanToolIcon size={17} />
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
      <summary className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-[var(--color-border-soft)] text-[var(--color-text-secondary)]">
        <PaletteIcon size={14} />
      </summary>
      <div className="absolute bottom-full right-0 z-10 mb-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-background)] p-3 shadow-lg">
        <ColorWheelPicker value={color} onChange={onChange} size={160} />
      </div>
    </details>
  );
}
