"use client";

import { useState } from "react";

import { mapUserSummary } from "@/lib/api/mappers";
import { ApiError, gamesApi } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { CardColorDto, MenzoCardDto, MenzoCardsActionDto, MenzoCardsViewDto, MatchResponseDto } from "@/lib/api/types";

const COLOR_CSS: Record<CardColorDto, string> = {
  RED: "var(--color-coral)",
  BLUE: "var(--color-cyan)",
  GREEN: "var(--color-green)",
  YELLOW: "var(--color-yellow)",
};
const COLOR_LABEL: Record<CardColorDto, string> = { RED: "Rojo", BLUE: "Azul", GREEN: "Verde", YELLOW: "Amarillo" };

function cardBackground(card: MenzoCardDto): string {
  if (card.color) return COLOR_CSS[card.color];
  // Comodín sin color todavía (en la mano, no jugado) — degradado con los 4 colores de Menzo.
  return `conic-gradient(${COLOR_CSS.RED}, ${COLOR_CSS.YELLOW}, ${COLOR_CSS.GREEN}, ${COLOR_CSS.BLUE}, ${COLOR_CSS.RED})`;
}

function cardLabel(card: MenzoCardDto): string {
  switch (card.kind) {
    case "NUMBER":
      return String(card.number);
    case "SKIP":
      return "Bloq";
    case "REVERSE":
      return "↺";
    case "DRAW_TWO":
      return "+2";
    case "WILD":
      return "Libre";
    case "WILD_DRAW_FOUR":
      return "+4";
  }
}

/** Tablero de Menzo Cards — a diferencia de Ludo, el `state` que llega acá NUNCA incluye las
 * cartas de otro jugador (ver MenzoCardsEngine.viewFor en menzoapi): `players[].cardCount` es lo
 * único que se sabe del resto, `hand` son siempre las propias. Mismo criterio que LudoBoard: solo
 * manda INTENCIONES por REST (gamesApi.act), el servidor valida cada jugada. */
export function MenzoCardsBoard({ match, myId }: { match: MatchResponseDto; myId: string | null }) {
  const showToast = useToast();
  const view = match.state as MenzoCardsViewDto;
  const [submitting, setSubmitting] = useState(false);
  const [pendingWildIndex, setPendingWildIndex] = useState<number | null>(null);

  async function submit(action: MenzoCardsActionDto) {
    if (submitting) return;
    setSubmitting(true);
    try {
      await gamesApi.act(match.id, { action, actionId: crypto.randomUUID() });
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : "No pudimos realizar esa jugada.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleCardTap(index: number, card: MenzoCardDto) {
    if (!view.myTurn || submitting) return;
    if (card.kind === "WILD" || card.kind === "WILD_DRAW_FOUR") {
      setPendingWildIndex(index);
      return;
    }
    submit({ type: "PLAY_CARD", cardIndex: index });
  }

  function chooseWildColor(color: CardColorDto) {
    if (pendingWildIndex == null) return;
    submit({ type: "PLAY_CARD", cardIndex: pendingWildIndex, chosenColor: color });
    setPendingWildIndex(null);
  }

  const currentPlayerSummary = match.players[view.currentPlayerIndex];
  const currentPlayerName = currentPlayerSummary ? mapUserSummary(currentPlayerSummary.user, null).displayName : "otro jugador";
  const canDraw = view.myTurn && !view.hasDrawnThisTurn;
  const canPass = view.myTurn && view.hasDrawnThisTurn;

  return (
    <div className="flex h-full flex-col items-center gap-3 px-4 py-3">
      <div className="flex w-full max-w-md items-center justify-between rounded-full bg-[var(--color-surface-secondary)] px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: COLOR_CSS[view.activeColor] }} />
          <span className="text-sm font-semibold">{view.myTurn ? "Tu turno" : `Turno de ${currentPlayerName}`}</span>
        </div>
        <span className="text-xs text-[var(--color-text-muted)]">{COLOR_LABEL[view.activeColor]} en juego</span>
      </div>

      {/* Oponentes — solo cantidad de cartas, nunca las cartas en sí. */}
      <div className="flex w-full max-w-md flex-wrap justify-center gap-2">
        {view.players
          .filter((p) => p.userId !== myId)
          .map((p) => {
            const summary = match.players.find((mp) => mp.user.id === p.userId);
            const user = summary ? mapUserSummary(summary.user, null) : null;
            const isCurrent = match.players.findIndex((mp) => mp.user.id === p.userId) === view.currentPlayerIndex;
            return (
              <div
                key={p.userId}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${isCurrent ? "bg-[var(--color-orange)]/20 text-[var(--color-orange)]" : "bg-[var(--color-surface-secondary)]"}`}
              >
                <span className={!p.active ? "text-[var(--color-text-muted)] line-through" : ""}>{user?.displayName ?? "Jugador"}</span>
                <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[10px] font-semibold">{p.cardCount}</span>
              </div>
            );
          })}
      </div>

      {/* Centro: mazo + descarte */}
      <div className="flex flex-1 items-center justify-center gap-6">
        <button
          onClick={() => submit({ type: "DRAW_CARD" })}
          disabled={!canDraw || submitting}
          className="flex h-24 w-16 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-[var(--color-border-strong)] text-[var(--color-text-muted)] transition-transform active:scale-95 disabled:cursor-default disabled:opacity-40"
          aria-label="Robar carta"
        >
          <span className="text-[10px] font-semibold">{view.drawPileCount}</span>
          <span className="text-xs">Robar</span>
        </button>

        <div
          className="flex h-24 w-16 items-center justify-center rounded-xl text-lg font-extrabold text-white shadow-lg"
          style={{ background: cardBackground(view.topDiscard) }}
        >
          {cardLabel(view.topDiscard)}
        </div>
      </div>

      {canPass && (
        <button
          onClick={() => submit({ type: "PASS_TURN" })}
          disabled={submitting}
          className="rounded-full bg-[var(--color-surface-secondary)] px-4 py-2 text-xs font-semibold cursor-pointer disabled:opacity-50"
        >
          Pasar turno
        </button>
      )}

      {/* Mi mano */}
      <div className="w-full max-w-md overflow-x-auto">
        <div className="flex gap-2 pb-2">
          {view.hand.map((card, i) => (
            <button
              key={i}
              onClick={() => handleCardTap(i, card)}
              disabled={!view.myTurn || submitting}
              className="flex h-24 w-16 shrink-0 items-center justify-center rounded-xl text-lg font-extrabold text-white shadow-md transition-transform enabled:hover:-translate-y-1 disabled:cursor-default disabled:opacity-70"
              style={{ background: cardBackground(card) }}
            >
              {cardLabel(card)}
            </button>
          ))}
        </div>
      </div>

      {pendingWildIndex != null && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4" onClick={() => setPendingWildIndex(null)}>
          <div
            className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface)] p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold">Elegí un color</p>
            <div className="flex gap-3">
              {(Object.keys(COLOR_CSS) as CardColorDto[]).map((color) => (
                <button
                  key={color}
                  onClick={() => chooseWildColor(color)}
                  className="h-12 w-12 rounded-full border-2 border-white/10 transition-transform hover:scale-110 cursor-pointer"
                  style={{ background: COLOR_CSS[color] }}
                  aria-label={COLOR_LABEL[color]}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
