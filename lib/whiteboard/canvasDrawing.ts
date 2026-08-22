import type { WhiteboardStrokePoint } from "@/lib/api/types";
import type { WhiteboardToolKind } from "@/lib/realtime/useWhiteboardSocket";

/** Compartido entre la pizarra colaborativa (WhiteboardCanvas) y el mini-lienzo de un post tipo
 * "Dibujo" (DrawingCanvas) — mismo trazado en <canvas> 2D, misma paleta rápida de colores. */
export const QUICK_COLORS = ["#000000", "#FFFFFF", "#FF7A1A", "#FF5C5C", "#22D3EE", "#2ECC71", "#9B59B6", "#F1C40F"];

export function drawStroke(
  ctx: CanvasRenderingContext2D,
  tool: WhiteboardToolKind,
  color: string | null,
  width: number,
  points: WhiteboardStrokePoint[],
  background: string
) {
  if (points.length === 0) return;
  const strokeColor = tool === "eraser" ? background : color || "#000000";
  if (points.length === 1) {
    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

export function randomStrokeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}
