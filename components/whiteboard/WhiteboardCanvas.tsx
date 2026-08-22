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

// Lienzo grande pero acotado (no infinito de verdad) — antes vivía dentro de un contenedor con
// scroll nativo del navegador, sin ningún pan/zoom real. Ahora es un viewport de tamaño fijo
// (overflow:hidden) con una capa interna transformada (CSS transform translate+scale) que sí
// soporta pinch-zoom/pan reales, mismo criterio que InteractiveViewer del lado móvil.
const BOARD_WIDTH = 4000;
const BOARD_HEIGHT = 4900;
const BACKGROUND = "#F5F1E8";
const MIN_SCALE = 0.5;
const MAX_SCALE = 4;

type LiveStroke = { tool: WhiteboardToolKind; color: string | null; width: number; points: WhiteboardStrokePoint[] };
type Transform = { scale: number; x: number; y: number };
type ScreenPoint = { x: number; y: number };

function clampScale(s: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
}
function distance(a: ScreenPoint, b: ScreenPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function midpoint(a: ScreenPoint, b: ScreenPoint) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function WhiteboardCanvas({ communityId, canClear }: { communityId: string; canClear: boolean }) {
  const myUserId = getCachedSession()?.userId ?? null;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const settledCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [strokes, setStrokes] = useState<WhiteboardStrokeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tool, setTool] = useState<WhiteboardToolKind>("pen");
  const [moveMode, setMoveMode] = useState(false);
  const [color, setColor] = useState("#000000");
  const [width, setWidth] = useState(6);
  // Solo para el indicador de % del cluster de zoom — el transform real vive en transformRef y
  // se aplica directo al DOM (ver applyTransform), nunca dispara un re-render de React mientras
  // se hace pinch/pan (mismo criterio que myPointsRef para el dibujo).
  const [scaleDisplay, setScaleDisplay] = useState(1);

  // Trazos en curso de OTRAS personas (strokeId -> puntos acumulados) + el propio trazo local
  // mientras se dibuja — nunca pasan por React state (evita un re-render por cada punto del
  // arrastre), se dibujan imperativamente en la capa "en vivo" (ver redrawLive).
  const inProgressRef = useRef<Map<string, LiveStroke>>(new Map());
  const myStrokeIdRef = useRef<string | null>(null);
  const myPointsRef = useRef<WhiteboardStrokePoint[]>([]);
  const pendingSegmentRef = useRef<WhiteboardStrokePoint[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toolRef = useRef(tool);
  const moveModeRef = useRef(moveMode);
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  // Mutar refs es un efecto secundario, no puede pasar durante el render — mismo criterio que
  // handlersRef en useWhiteboardSocket.ts (sin array de dependencias: corre después de CADA
  // render, así los handlers de puntero — que viven fuera del ciclo de re-render de React —
  // siempre leen el tool/color/width más reciente sin quedar pegados a un closure viejo).
  useEffect(() => {
    toolRef.current = tool;
    moveModeRef.current = moveMode;
    colorRef.current = color;
    widthRef.current = width;
  });

  // Transform (pan/zoom) — 100% local al viewport de este usuario, nunca se manda por
  // WebSocket (a diferencia de los trazos, que sí se sincronizan).
  const transformRef = useRef<Transform>({ scale: 1, x: 0, y: 0 });
  const activePointersRef = useRef<Map<number, ScreenPoint>>(new Map());
  const pinchStateRef = useRef<{ startDist: number; startScale: number; startMidLocal: ScreenPoint; startTransform: Transform } | null>(null);
  const panStateRef = useRef<{ startClient: ScreenPoint; startTransform: Transform } | null>(null);
  // true desde que un 2º puntero toca hasta que se sueltan TODOS — evita que, al terminar un
  // pinch y quedar un solo dedo apoyado un instante, ese dedo arranque un trazo sin querer.
  const multiTouchActiveRef = useRef(false);

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
    if (myStrokeIdRef.current) drawStroke(ctx, toolRef.current, colorRef.current, widthRef.current, myPointsRef.current, BACKGROUND);
  }, []);

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

  function applyTransform() {
    const el = boardRef.current;
    if (!el) return;
    const { scale, x, y } = transformRef.current;
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
  }

  function setTransform(next: Transform) {
    transformRef.current = { scale: clampScale(next.scale), x: next.x, y: next.y };
    applyTransform();
  }

  /** Convierte un punto de pantalla (clientX/Y) a coordenadas de DOCUMENTO — invierte el
   * transform actual. Los trazos se guardan/mandan siempre en este espacio, nunca en
   * coordenadas ya escaladas (eso es lo que hacía que dibujar con zoom aplicado se viera
   * desfasado antes de este cambio). */
  function screenToDoc(clientX: number, clientY: number): WhiteboardStrokePoint {
    const rect = viewportRef.current!.getBoundingClientRect();
    const { scale, x, y } = transformRef.current;
    return { x: (clientX - rect.left - x) / scale, y: (clientY - rect.top - y) / scale };
  }

  function zoomAtScreenPoint(clientX: number, clientY: number, factor: number) {
    const rect = viewportRef.current!.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;
    const { scale, x, y } = transformRef.current;
    const newScale = clampScale(scale * factor);
    // El punto del documento que hoy cae bajo (localX,localY) se mantiene ahí después del zoom.
    const docX = (localX - x) / scale;
    const docY = (localY - y) / scale;
    setTransform({ scale: newScale, x: localX - docX * newScale, y: localY - docY * newScale });
    setScaleDisplay(newScale);
  }

  function zoomButton(factor: number) {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;
    zoomAtScreenPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  }

  function resetView() {
    setTransform({ scale: 1, x: 0, y: 0 });
    setScaleDisplay(1);
  }

  function beginStroke(point: WhiteboardStrokePoint) {
    myStrokeIdRef.current = randomStrokeId();
    myPointsRef.current = [point];
    pendingSegmentRef.current = [point];
    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    flushTimerRef.current = setInterval(flushSegment, 40);
    redrawLive();
  }

  /** Descarta cualquier trazo a medio dibujar sin mandar nada al servidor — nunca se commitea
   * un trazo corrupto (p. ej. porque se sumó un segundo dedo a mitad de un trazo de 1 dedo). */
  function abortStroke() {
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    myStrokeIdRef.current = null;
    myPointsRef.current = [];
    pendingSegmentRef.current = [];
    redrawLive();
  }

  function flushSegment() {
    const strokeId = myStrokeIdRef.current;
    if (!strokeId || pendingSegmentRef.current.length === 0) return;
    socket.sendSegment({
      strokeId,
      tool: toolRef.current,
      color: toolRef.current === "eraser" ? null : colorRef.current,
      width: widthRef.current,
      points: pendingSegmentRef.current,
    });
    pendingSegmentRef.current = [];
  }

  function commitStroke() {
    const strokeId = myStrokeIdRef.current;
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    if (strokeId && myPointsRef.current.length > 0) {
      const points = myPointsRef.current;
      const strokeTool = toolRef.current;
      const strokeColor = strokeTool === "eraser" ? null : colorRef.current;
      const strokeWidth = widthRef.current;
      socket.sendStrokeComplete({ strokeId, tool: strokeTool, color: strokeColor, width: strokeWidth, points });
      if (myUserId) {
        setStrokes((prev) => [
          ...prev,
          { id: strokeId, strokeId, communityId, authorId: myUserId, tool: strokeTool, color: strokeColor, width: strokeWidth, points, createdAt: new Date().toISOString() },
        ]);
      }
    }
    myStrokeIdRef.current = null;
    myPointsRef.current = [];
    pendingSegmentRef.current = [];
    redrawLive();
  }

  function beginPinch() {
    const pts = [...activePointersRef.current.values()];
    if (pts.length < 2) return;
    const [a, b] = pts;
    const rect = viewportRef.current!.getBoundingClientRect();
    const mid = midpoint(a, b);
    pinchStateRef.current = {
      startDist: distance(a, b),
      startScale: transformRef.current.scale,
      startMidLocal: { x: mid.x - rect.left, y: mid.y - rect.top },
      startTransform: { ...transformRef.current },
    };
  }

  function updatePinch() {
    const pinch = pinchStateRef.current;
    const pts = [...activePointersRef.current.values()];
    if (!pinch || pts.length < 2) return;
    const [a, b] = pts;
    const rect = viewportRef.current!.getBoundingClientRect();
    const dist = distance(a, b);
    const mid = midpoint(a, b);
    const midLocal = { x: mid.x - rect.left, y: mid.y - rect.top };
    const newScale = clampScale(pinch.startScale * (dist / pinch.startDist));
    // Punto de documento que estaba bajo el punto medio INICIAL del pinch — se mantiene bajo el
    // punto medio ACTUAL (que ya se movió, dando el pan simultáneo al zoom).
    const docAtStart = {
      x: (pinch.startMidLocal.x - pinch.startTransform.x) / pinch.startTransform.scale,
      y: (pinch.startMidLocal.y - pinch.startTransform.y) / pinch.startTransform.scale,
    };
    setTransform({ scale: newScale, x: midLocal.x - docAtStart.x * newScale, y: midLocal.y - docAtStart.y * newScale });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size >= 2) {
      if (!multiTouchActiveRef.current) {
        multiTouchActiveRef.current = true;
        abortStroke();
      }
      beginPinch();
      return;
    }
    if (moveModeRef.current) {
      panStateRef.current = { startClient: { x: e.clientX, y: e.clientY }, startTransform: { ...transformRef.current } };
      return;
    }
    if (multiTouchActiveRef.current) return;
    beginStroke(screenToDoc(e.clientX, e.clientY));
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size >= 2) {
      updatePinch();
      return;
    }
    if (panStateRef.current) {
      const { startClient, startTransform } = panStateRef.current;
      setTransform({
        scale: startTransform.scale,
        x: startTransform.x + (e.clientX - startClient.x),
        y: startTransform.y + (e.clientY - startClient.y),
      });
      return;
    }
    if (multiTouchActiveRef.current || moveModeRef.current) return;
    if (!myStrokeIdRef.current) return;
    const point = screenToDoc(e.clientX, e.clientY);
    myPointsRef.current.push(point);
    pendingSegmentRef.current.push(point);
    redrawLive();
  }

  function handlePointerUpOrCancel(e: React.PointerEvent<HTMLDivElement>) {
    activePointersRef.current.delete(e.pointerId);
    panStateRef.current = null;
    if (activePointersRef.current.size < 2) pinchStateRef.current = null;
    if (activePointersRef.current.size === 0) {
      multiTouchActiveRef.current = false;
      commitStroke();
      setScaleDisplay(transformRef.current.scale);
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    zoomAtScreenPoint(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 0.9);
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
      <div
        ref={viewportRef}
        data-no-swipe-nav
        className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-[var(--color-border-soft)]"
        style={{ touchAction: "none", cursor: moveMode ? "grab" : "crosshair" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUpOrCancel}
        onPointerCancel={handlePointerUpOrCancel}
        onWheel={handleWheel}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--color-text-muted)]">Cargando pizarra...</div>
        ) : (
          <div ref={boardRef} style={{ position: "absolute", top: 0, left: 0, width: BOARD_WIDTH, height: BOARD_HEIGHT, transformOrigin: "0 0" }}>
            <canvas ref={settledCanvasRef} width={BOARD_WIDTH} height={BOARD_HEIGHT} style={{ position: "absolute", inset: 0 }} />
            <canvas ref={liveCanvasRef} width={BOARD_WIDTH} height={BOARD_HEIGHT} style={{ position: "absolute", inset: 0 }} />
          </div>
        )}
        {!loading && (
          <div className="absolute bottom-3 right-3 flex flex-col items-center gap-0.5 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]/90 p-1">
            <button
              type="button"
              onClick={() => zoomButton(1.25)}
              aria-label="Acercar"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] cursor-pointer"
            >
              +
            </button>
            <button
              type="button"
              onClick={resetView}
              aria-label="Restablecer vista"
              title="Restablecer vista"
              className="w-full rounded-lg px-1 py-0.5 text-center text-[11px] font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] cursor-pointer"
            >
              {Math.round(scaleDisplay * 100)}%
            </button>
            <button
              type="button"
              onClick={() => zoomButton(0.8)}
              aria-label="Alejar"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] cursor-pointer"
            >
              −
            </button>
          </div>
        )}
      </div>
      <WhiteboardToolbar
        tool={tool}
        moveMode={moveMode}
        color={color}
        width={width}
        canClear={canClear}
        onToolChange={(t) => {
          setTool(t);
          setMoveMode(false);
        }}
        onSelectMove={() => setMoveMode(true)}
        onColorChange={setColor}
        onWidthChange={setWidth}
        onUndo={socket.sendUndo}
        onClear={handleClear}
      />
    </div>
  );
}
