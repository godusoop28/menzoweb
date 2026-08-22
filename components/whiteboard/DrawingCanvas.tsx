"use client";

import { useEffect, useRef, useState } from "react";

import { uploadsApi } from "@/lib/api";
import type { WhiteboardStrokePoint } from "@/lib/api/types";
import { drawStroke, QUICK_COLORS } from "@/lib/whiteboard/canvasDrawing";
import type { WhiteboardToolKind } from "@/lib/realtime/useWhiteboardSocket";
import { GradientButton } from "@/components/GradientButton";
import { EditIcon, EraserIcon } from "@/components/icons";
import { ColorPopover } from "./WhiteboardToolbar";

const CANVAS_SIZE = 512;
const BACKGROUND = "#FFFFFF";

type Stroke = { tool: WhiteboardToolKind; color: string; width: number; points: WhiteboardStrokePoint[] };

/** Mini-lienzo PERSONAL para un post tipo "Dibujo" (sección "una especie de historias" del
 * pedido) — mismas herramientas que la pizarra colaborativa de la comunidad (WhiteboardCanvas),
 * pero 100% local: nada de STOMP, nada compartido, "deshacer"/"borrar todo" son operaciones
 * puramente en memoria. Al terminar, rasteriza el canvas a PNG y lo sube por el mismo
 * `/api/uploads` que ya usan las imágenes de BlockEditor — el caller (CreatePostComposer) arma
 * el bloque de imagen con la URL resultante, mismo camino que un post de imagen normal. */
export function DrawingCanvas({ onUploaded }: { onUploaded: (url: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentRef = useRef<WhiteboardStrokePoint[] | null>(null);

  const [tool, setTool] = useState<WhiteboardToolKind>("pen");
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(6);
  const [hasContent, setHasContent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function redraw() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const s of strokesRef.current) drawStroke(ctx, s.tool, s.color, s.width, s.points, BACKGROUND);
    if (currentRef.current) drawStroke(ctx, tool, color, width, currentRef.current, BACKGROUND);
  }

  useEffect(() => {
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo para pintar el fondo blanco al montar
  }, []);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): WhiteboardStrokePoint {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function handleDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    currentRef.current = [pointFromEvent(e)];
    redraw();
  }

  function handleMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!currentRef.current) return;
    currentRef.current.push(pointFromEvent(e));
    redraw();
  }

  function handleUp() {
    if (currentRef.current && currentRef.current.length > 0) {
      strokesRef.current.push({ tool, color, width, points: currentRef.current });
      setHasContent(true);
    }
    currentRef.current = null;
    redraw();
  }

  function handleUndo() {
    strokesRef.current.pop();
    setHasContent(strokesRef.current.length > 0);
    redraw();
  }

  function handleClearAll() {
    strokesRef.current = [];
    setHasContent(false);
    redraw();
  }

  async function handleUse() {
    const canvas = canvasRef.current;
    if (!canvas || !hasContent || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("no blob");
      const file = new File([blob], "dibujo.png", { type: "image/png" });
      const url = await uploadsApi.upload(file);
      onUploaded(url);
    } catch {
      setError("No pudimos subir el dibujo. Intentá de nuevo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ width: "100%", maxWidth: CANVAS_SIZE, aspectRatio: "1 / 1", touchAction: "none", cursor: "crosshair" }}
        className="rounded-xl border border-[var(--color-border-soft)]"
        onPointerDown={handleDown}
        onPointerMove={handleMove}
        onPointerUp={handleUp}
        onPointerCancel={handleUp}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setTool("pen")}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border cursor-pointer ${
            tool === "pen" ? "border-[var(--color-orange)] bg-[var(--color-orange)]/15" : "border-[var(--color-border-soft)]"
          }`}
          aria-label="Pincel"
        >
          <EditIcon size={17} />
        </button>
        <button
          type="button"
          onClick={() => setTool("eraser")}
          className={`flex h-9 w-9 items-center justify-center rounded-lg border cursor-pointer ${
            tool === "eraser" ? "border-[var(--color-orange)] bg-[var(--color-orange)]/15" : "border-[var(--color-border-soft)]"
          }`}
          aria-label="Borrador"
        >
          <EraserIcon size={17} />
        </button>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {QUICK_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`h-7 w-7 shrink-0 rounded-full border-2 cursor-pointer ${
                color.toUpperCase() === c ? "border-[var(--color-orange)]" : "border-[var(--color-border-soft)]"
              }`}
              style={{ background: c }}
              aria-label={c}
            />
          ))}
          <ColorPopover color={color} onChange={setColor} />
        </div>
        <button
          type="button"
          onClick={handleUndo}
          className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-medium cursor-pointer hover:border-[var(--color-border-strong)]"
        >
          Deshacer
        </button>
        <button
          type="button"
          onClick={handleClearAll}
          className="rounded-lg border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-medium cursor-pointer hover:border-[var(--color-border-strong)]"
        >
          Borrar todo
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-text-muted)]">Grosor</span>
        <input
          type="range"
          min={2}
          max={32}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="w-full accent-[var(--color-orange)]"
        />
      </div>
      {error && <p className="text-xs text-[var(--color-coral)]">{error}</p>}
      <GradientButton
        label={uploading ? "Subiendo..." : "Usar este dibujo"}
        onClick={handleUse}
        disabled={!hasContent || uploading}
        loading={uploading}
        fullWidth={false}
        size="md"
      />
    </div>
  );
}
