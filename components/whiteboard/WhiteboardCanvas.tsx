"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, getCachedSession, whiteboardApi } from "@/lib/api";
import type { WhiteboardStrokeDto, WhiteboardStrokePoint } from "@/lib/api/types";
import { drawStroke, randomStrokeId } from "@/lib/whiteboard/canvasDrawing";
import {
  useWhiteboardSocket,
  type SegmentEvent,
  type StrokeCompleteEvent,
  type WhiteboardToolKind,
} from "@/lib/realtime/useWhiteboardSocket";
import { WhiteboardToolbar } from "./WhiteboardToolbar";

// Lienzo grande pero acotado (no infinito de verdad) dentro de un contenedor con scroll — más
// simple y correcto que pan/zoom con transform a mano, mismo criterio que la versión mobile
// (que usa InteractiveViewer, el equivalente nativo de "contenedor grande con scroll/zoom").
const BOARD_WIDTH = 4000;
const BOARD_HEIGHT = 4900;
const BACKGROUND = "#F5F1E8";

type LiveStroke = { tool: WhiteboardToolKind; color: string | null; width: number; points: WhiteboardStrokePoint[] };

export function WhiteboardCanvas({ communityId, canClear }: { communityId: string; canClear: boolean }) {
  const myUserId = getCachedSession()?.userId ?? null;
  const settledCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [strokes, setStrokes] = useState<WhiteboardStrokeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tool, setTool] = useState<WhiteboardToolKind>("pen");
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(6);

  // Trazos en curso de OTRAS personas (strokeId -> puntos acumulados) + el propio trazo local
  // mientras se dibuja — nunca pasan por React state (evita un re-render por cada punto del
  // arrastre), se dibujan imperativamente en la capa "en vivo" (ver redrawLive).
  const inProgressRef = useRef<Map<string, LiveStroke>>(new Map());
  const myStrokeIdRef = useRef<string | null>(null);
  const myPointsRef = useRef<WhiteboardStrokePoint[]>([]);
  const pendingSegmentRef = useRef<WhiteboardStrokePoint[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const page = await whiteboardApi.strokes(communityId);
      setStrokes(page.items);
      inProgressRef.current.clear();
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cargar la pizarra.");
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con el sistema externo (la API) apenas cambia communityId, mismo criterio que CommunityContext.tsx.
    loadHistory();
  }, [loadHistory]);

  const redrawLive = useCallback(() => {
    const canvas = liveCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of inProgressRef.current.values()) drawStroke(ctx, s.tool, s.color, s.width, s.points, BACKGROUND);
    if (myStrokeIdRef.current) drawStroke(ctx, tool, color, width, myPointsRef.current, BACKGROUND);
  }, [tool, color, width]);

  const socket = useWhiteboardSocket(communityId, {
    onSegment: (event: SegmentEvent) => {
      if (event.authorId === myUserId) return; // el propio trazo ya se ve local, optimista
      const existing = inProgressRef.current.get(event.strokeId);
      inProgressRef.current.set(event.strokeId, {
        tool: event.tool,
        color: event.color,
        width: event.width,
        points: existing ? [...existing.points, ...event.points] : event.points,
      });
      redrawLive();
    },
    onStrokeComplete: (event: StrokeCompleteEvent) => {
      inProgressRef.current.delete(event.strokeId);
      if (event.authorId === myUserId) {
        redrawLive();
        return; // ya se agregó a `strokes` de forma optimista al soltar
      }
      setStrokes((prev) => [
        ...prev,
        {
          id: event.strokeId,
          strokeId: event.strokeId,
          communityId,
          authorId: event.authorId,
          tool: event.tool,
          color: event.color,
          width: event.width,
          points: event.points,
          createdAt: event.createdAt,
        },
      ]);
      redrawLive();
    },
    onBoardCleared: () => {
      setStrokes([]);
      inProgressRef.current.clear();
      redrawLive();
    },
    onStrokeRemoved: (strokeId: string) => {
      setStrokes((prev) => prev.filter((s) => s.strokeId !== strokeId));
    },
    onReconnected: loadHistory,
  });

  // Capa asentada — se redibuja solo cuando cambia la LISTA de trazos (historial cargado, un
  // trazo remoto se completó, se limpió/deshizo la pizarra), nunca en cada frame de dibujo.
  useEffect(() => {
    const canvas = settledCanvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    ctx.fillStyle = BACKGROUND;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes) drawStroke(ctx, s.tool, s.color, s.width, s.points, BACKGROUND);
  }, [strokes]);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): WhiteboardStrokePoint {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    myStrokeIdRef.current = randomStrokeId();
    const point = pointFromEvent(e);
    myPointsRef.current = [point];
    pendingSegmentRef.current = [point];
    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    flushTimerRef.current = setInterval(flushSegment, 40);
    redrawLive();
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!myStrokeIdRef.current) return;
    const point = pointFromEvent(e);
    myPointsRef.current.push(point);
    pendingSegmentRef.current.push(point);
    redrawLive();
  }

  function flushSegment() {
    const strokeId = myStrokeIdRef.current;
    if (!strokeId || pendingSegmentRef.current.length === 0) return;
    socket.sendSegment({
      strokeId,
      tool,
      color: tool === "eraser" ? null : color,
      width,
      points: pendingSegmentRef.current,
    });
    pendingSegmentRef.current = [];
  }

  function handlePointerUp() {
    const strokeId = myStrokeIdRef.current;
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (strokeId && myPointsRef.current.length > 0) {
      const points = myPointsRef.current;
      socket.sendStrokeComplete({ strokeId, tool, color: tool === "eraser" ? null : color, width, points });
      if (myUserId) {
        setStrokes((prev) => [
          ...prev,
          { id: strokeId, strokeId, communityId, authorId: myUserId, tool, color: tool === "eraser" ? null : color, width, points, createdAt: new Date().toISOString() },
        ]);
      }
    }
    myStrokeIdRef.current = null;
    myPointsRef.current = [];
    pendingSegmentRef.current = [];
    redrawLive();
  }

  async function handleClear() {
    if (!confirm("¿Limpiar la pizarra? Se borra todo lo que dibujó la comunidad — no se puede deshacer.")) return;
    try {
      await whiteboardApi.clear(communityId);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos limpiar la pizarra.");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {error && <p className="px-3 py-1 text-sm text-[var(--color-coral)]">{error}</p>}
      <div className="relative min-h-0 flex-1 overflow-auto rounded-xl border border-[var(--color-border-soft)]">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">Cargando pizarra...</div>
        ) : (
          <div style={{ position: "relative", width: BOARD_WIDTH, height: BOARD_HEIGHT }}>
            <canvas ref={settledCanvasRef} width={BOARD_WIDTH} height={BOARD_HEIGHT} style={{ position: "absolute", inset: 0 }} />
            <canvas
              ref={liveCanvasRef}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              style={{ position: "absolute", inset: 0, touchAction: "none", cursor: "crosshair" }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </div>
        )}
      </div>
      <WhiteboardToolbar
        tool={tool}
        color={color}
        width={width}
        canClear={canClear}
        onToolChange={setTool}
        onColorChange={setColor}
        onWidthChange={setWidth}
        onUndo={socket.sendUndo}
        onClear={handleClear}
      />
    </div>
  );
}
