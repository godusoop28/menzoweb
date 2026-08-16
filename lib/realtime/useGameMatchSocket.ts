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
 * jugador). El hook no necesita saber cuál es cuál. */
export function useGameMatchSocket(topic: string | undefined, onEvent: (event: GameEventDto) => void) {
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

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
      },
    });
    client.activate();

    return () => {
      client.deactivate();
    };
  }, [topic]);
}
