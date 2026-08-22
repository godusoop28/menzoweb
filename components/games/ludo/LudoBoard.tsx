"use client";

import { useMemo, useState } from "react";

import { DiceIcon } from "@/components/icons";
import { mapUserSummary } from "@/lib/api/mappers";
import { ApiError, gamesApi } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { LudoActionDto, LudoStateDto, MatchResponseDto } from "@/lib/api/types";

const RING_LENGTH = 52;
const FINISH_STEP = 56;
const COLOR_STARTS = [0, 13, 26, 39];
// Mismo criterio de paleta que el resto de Menzo (ver globals.css) en vez de rojo/azul/amarillo/
// verde genéricos de plástico — identidad propia, no un reskin de un juego de mesa existente.
const PLAYER_COLORS = ["var(--color-coral)", "var(--color-cyan)", "var(--color-yellow)", "var(--color-green)"];

// Perímetro cuadrado de 76x76 (margen 12) dividido en 52 puntos parejos, 13 por lado — el índice
// 0/13/26/39 (COLOR_STARTS) cae justo al empezar cada lado, que es también donde vive la base de
// ese color (mismo criterio que un tablero real: se sale de la base directo a la primera casilla
// propia). No es el layout en cruz clásico pixel-a-pixel, pero conserva la misma topología (anillo
// compartido + 4 entradas equiespaciadas + tramo final privado hacia el centro).
const CORNERS = [
  { x: 12, y: 12 },
  { x: 88, y: 12 },
  { x: 88, y: 88 },
  { x: 12, y: 88 },
];
function ringPoint(index: number): { x: number; y: number } {
  const i = ((index % RING_LENGTH) + RING_LENGTH) % RING_LENGTH;
  const side = Math.floor(i / 13);
  const t = (i % 13) / 13;
  const a = CORNERS[side];
  const b = CORNERS[(side + 1) % 4];
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}
const BASE_QUADRANTS = [
  { x: 4, y: 4 },
  { x: 68, y: 4 },
  { x: 68, y: 68 },
  { x: 4, y: 68 },
];
const BASE_SLOTS = [
  { dx: 6, dy: 6 },
  { dx: 22, dy: 6 },
  { dx: 6, dy: 22 },
  { dx: 22, dy: 22 },
];
function basePoint(colorIndex: number, tokenIndex: number) {
  const q = BASE_QUADRANTS[colorIndex];
  const s = BASE_SLOTS[tokenIndex];
  return { x: q.x + s.dx, y: q.y + s.dy };
}
function homeStretchPoint(colorIndex: number, steps: number) {
  const entry = ringPoint(COLOR_STARTS[colorIndex]);
  const center = { x: 50, y: 50 };
  const inward = { x: entry.x + 0.2 * (center.x - entry.x), y: entry.y + 0.2 * (center.y - entry.y) };
  const t = (steps - 50) / 6;
  return { x: inward.x + t * (center.x - inward.x), y: inward.y + t * (center.y - inward.y) };
}
function tokenPoint(colorIndex: number, tokenIndex: number, steps: number) {
  if (steps === -1) return basePoint(colorIndex, tokenIndex);
  if (steps <= 50) return ringPoint((COLOR_STARTS[colorIndex] + steps) % RING_LENGTH);
  return homeStretchPoint(colorIndex, steps);
}
function canMoveLocal(steps: number, roll: number): boolean {
  if (steps === FINISH_STEP) return false;
  if (steps === -1) return roll === 6;
  return steps + roll <= FINISH_STEP;
}

/** Tablero de Ludo en vivo — recibe `state`/acciones vía props (el padre ya tiene la suscripción
 * STOMP y solo re-renderiza), acá solo se manda la INTENCIÓN de cada acción por REST
 * (gamesApi.act) con un actionId nuevo por click — el servidor es la única fuente de verdad para
 * el dado y la validez de cada movimiento (ver LudoEngine en menzoapi), este componente nunca
 * decide el resultado, solo qué fichas resaltar como jugables. */
export function LudoBoard({ match, myId }: { match: MatchResponseDto; myId: string | null }) {
  const showToast = useToast();
  const state = match.state as LudoStateDto;
  const [submitting, setSubmitting] = useState(false);

  const myPlayerIndex = useMemo(() => state.players.findIndex((p) => p.userId === myId), [state.players, myId]);
  const myTurn = myPlayerIndex === state.currentPlayerIndex;
  const currentPlayer = state.players[state.currentPlayerIndex];

  async function submit(action: LudoActionDto) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await gamesApi.act(match.id, { action, actionId: crypto.randomUUID() });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No pudimos realizar ese movimiento.");
    } finally {
      setSubmitting(false);
    }
  }

  const rollableNow = myTurn && state.pendingRoll == null && match.status === "PLAYING";
  const roll = state.pendingRoll;

  return (
    <div className="flex h-full flex-col items-center gap-4 px-4 py-3">
      <div className="flex w-full max-w-md items-center justify-between rounded-full bg-[var(--color-surface-secondary)] px-4 py-2">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ background: currentPlayer ? PLAYER_COLORS[currentPlayer.colorIndex] : undefined }}
          />
          <span className="text-sm font-semibold">
            {match.status === "PAUSED"
              ? "En pausa — reconectando…"
              : myTurn
                ? "Tu turno"
                : `Turno de ${mapUserSummary(match.players[state.currentPlayerIndex]?.user ?? match.players[0].user, null).displayName}`}
          </span>
        </div>
      </div>

      <div className="relative aspect-square w-full max-w-md">
        <svg viewBox="0 0 100 100" className="h-full w-full">
          {/* Anillo compartido */}
          {Array.from({ length: RING_LENGTH }).map((_, i) => {
            const p = ringPoint(i);
            const safe = COLOR_STARTS.includes(i);
            return <circle key={`ring-${i}`} cx={p.x} cy={p.y} r={safe ? 2.2 : 1.5} fill={safe ? "var(--color-surface-soft)" : "var(--color-border-soft)"} />;
          })}
          {/* Tramos finales privados */}
          {state.players.map((p) =>
            Array.from({ length: 6 }).map((_, s) => {
              const pt = homeStretchPoint(p.colorIndex, 51 + s);
              return <circle key={`home-${p.colorIndex}-${s}`} cx={pt.x} cy={pt.y} r={1.6} fill={PLAYER_COLORS[p.colorIndex]} opacity={0.35} />;
            })
          )}
          {/* Centro */}
          <circle cx={50} cy={50} r={5} fill="var(--color-surface-soft)" />
          {/* Bases */}
          {state.players.map((p) =>
            Array.from({ length: 4 }).map((_, t) => {
              const pt = basePoint(p.colorIndex, t);
              return (
                <circle
                  key={`base-${p.colorIndex}-${t}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={5}
                  fill="none"
                  stroke={PLAYER_COLORS[p.colorIndex]}
                  strokeWidth={0.6}
                  strokeDasharray="1.5,1"
                  opacity={0.5}
                />
              );
            })
          )}
          {/* Fichas */}
          {state.players.map((p, pIndex) =>
            state.tokenSteps[pIndex].map((steps, tIndex) => {
              const pt = tokenPoint(p.colorIndex, tIndex, steps);
              const playable = myTurn && roll != null && pIndex === myPlayerIndex && canMoveLocal(steps, roll) && p.active;
              return (
                <g
                  key={`token-${pIndex}-${tIndex}`}
                  style={{ transition: "transform 300ms ease", cursor: playable ? "pointer" : "default" }}
                  transform={`translate(${pt.x} ${pt.y})`}
                  onClick={() => playable && submit({ type: "MOVE_TOKEN", tokenIndex: tIndex })}
                >
                  {playable && <circle r={3.4} fill="none" stroke={PLAYER_COLORS[p.colorIndex]} strokeWidth={0.6} className="animate-pulse" />}
                  <circle r={2.6} fill={p.active ? PLAYER_COLORS[p.colorIndex] : "var(--color-text-muted)"} stroke="var(--color-background)" strokeWidth={0.5} />
                </g>
              );
            })
          )}
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          onClick={() => submit({ type: "ROLL_DICE" })}
          disabled={!rollableNow || submitting}
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-white transition-transform active:scale-95 cursor-pointer disabled:cursor-default disabled:opacity-40"
          style={{ background: currentPlayer ? PLAYER_COLORS[currentPlayer.colorIndex] : "var(--color-coral)" }}
          aria-label="Tirar dado"
        >
          {roll != null ? <span className="text-2xl font-bold">{roll}</span> : <DiceIcon size={26} />}
        </button>
        <p className="text-xs text-[var(--color-text-muted)]">
          {rollableNow ? "Tirá el dado" : roll != null && myTurn ? "Elegí una ficha" : "Esperando al otro jugador…"}
        </p>
      </div>

      <div className="flex w-full max-w-md flex-wrap justify-center gap-2">
        {state.players.map((p, i) => {
          const summary = match.players.find((mp) => mp.user.id === p.userId);
          const user = summary ? mapUserSummary(summary.user, null) : null;
          return (
            <div key={p.userId} className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLAYER_COLORS[p.colorIndex] }} />
              <span className={!p.active ? "text-[var(--color-text-muted)] line-through" : ""}>{user?.displayName ?? "Jugador"}</span>
              {summary && !summary.connected && p.active && <span className="text-[var(--color-text-muted)]">· reconectando</span>}
              {i === state.currentPlayerIndex && p.active && <span className="text-[var(--color-orange)]">●</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
