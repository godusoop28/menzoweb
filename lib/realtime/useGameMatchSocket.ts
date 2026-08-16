"use client";

import { Client } from "@stomp/stompjs";
import { useEffect, useRef } from "react";

import { API_BASE_URL, getCachedSession } from "@/lib/api";
import type { GameEventDto } from "@/lib/api/types";

function wsUrl(): string {
  return API_BASE_URL.replace(/^http/, "ws") + "/ws";
}

/** Mismo patrón que useRoomSocket: un Client STOMP propio por pantalla, no una conexión
 * compartida. `topic` lo decide quien llama — para un juego sin información oculta es
 * `/topic/matches/{id}/state` (público); para uno con información oculta por jugador (más
 * adelante: RPS/Cuatro Colores/Dibuja y Adivina) es `/topic/matches/{id}/players/{miUserId}/state`
 * (privado — ver StompAuthChannelInterceptor en menzoapi, que rechaza suscribirse al de otro
 * jugador). El hook no necesita saber cuál es cuál.
 *
 * `onConnected` se llama cada vez que el socket queda conectado y suscripto (conexión inicial Y
 * cada reconexión) — la pantalla lo usa para refetchear el estado por HTTP, porque el cliente
 * STOMP puede haberse perdido eventos mientras estaba caído (no hay replay de mensajes viejos). */
export function useGameMatchSocket(
  topic: string | undefined,
  onEvent: (event: GameEventDto) => void,
  onConnected?: () => void,
) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const onConnectedRef = useRef(onConnected);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  }, [onConnected]);

  useEffect(() => {
    if (!topic) return;
    const session = getCachedSession();
    if (!session) return;

    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${session.accessToken}` },
      reconnectDelay: 3000,
      onConnect: () => {
        client.subscribe(topic, (frame) => {
          onEventRef.current(JSON.parse(frame.body) as GameEventDto);
        });
        onConnectedRef.current?.();
      },
      onStompError: (frame) => {
        console.error("[menzo/web] STOMP error", frame.headers["message"], frame.body);
      },
      onWebSocketError: (event) => {
        console.error("[menzo/web] WebSocket error en", topic, event);
      },
      onDisconnect: () => {
        console.warn("[menzo/web] STOMP desconectado de", topic);
      },
    });
    client.activate();

    return () => {
      client.deactivate();
    };
  }, [topic]);
}
