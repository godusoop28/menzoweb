"use client";

import { Client } from "@stomp/stompjs";
import { useEffect, useRef, useState } from "react";

import { API_BASE_URL, getCachedSession } from "@/lib/api";
import type { GameEventDto } from "@/lib/api/types";

function wsUrl(): string {
  return API_BASE_URL.replace(/^http/, "ws") + "/ws";
}

type GameMatchSocketHandlers = {
  onEvent: (event: GameEventDto) => void;
  /** Mismo criterio que onReconnected en useWhiteboardSocket.ts — STOMP no reentrega lo perdido
   * mientras el socket estuvo caído, así que hay que re-pedir el estado actual por REST
   * (gamesApi.get) cuando esto dispara. */
  onReconnected: () => void;
};

/** Estado en vivo de una partida — se suscribe a /topic/matches/{matchId}/state (o, si el motor
 * tiene información oculta por jugador, a /topic/matches/{matchId}/players/{userId}/state — ver
 * MatchService.hasHiddenState en menzoapi). Las acciones de juego NO pasan por este socket: se
 * mandan por REST (gamesApi.act), el servidor valida y recién ahí este socket recibe el nuevo
 * estado — el mismo patrón que ya usa GameMatchController. */
export function useGameMatchSocket(
  matchId: string | undefined,
  hasHiddenState: boolean,
  handlers: GameMatchSocketHandlers
) {
  const [connected, setConnected] = useState(false);
  // Los handlers son closures inline del caller, cambian de identidad en cada render — una ref
  // evita reconectar el socket por eso (mismo criterio que handlersRef en useWhiteboardSocket.ts).
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!matchId) return;
    const session = getCachedSession();
    if (!session) return;

    const topic = hasHiddenState
      ? `/topic/matches/${matchId}/players/${session.userId}/state`
      : `/topic/matches/${matchId}/state`;

    let hasConnectedBefore = false;
    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${session.accessToken}` },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        if (hasConnectedBefore) handlersRef.current.onReconnected();
        hasConnectedBefore = true;

        client.subscribe(topic, (frame) => {
          const event = JSON.parse(frame.body) as GameEventDto;
          handlersRef.current.onEvent(event);
        });
      },
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    });
    client.activate();

    return () => {
      client.deactivate();
      setConnected(false);
    };
  }, [matchId, hasHiddenState]);

  return { connected };
}
