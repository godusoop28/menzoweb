"use client";

import { Client } from "@stomp/stompjs";
import { useCallback, useEffect, useRef, useState } from "react";

import { API_BASE_URL, getCachedSession } from "@/lib/api";
import type { WhiteboardStrokePoint } from "@/lib/api/types";

function wsUrl(): string {
  return API_BASE_URL.replace(/^http/, "ws") + "/ws";
}

export type WhiteboardToolKind = "pen" | "eraser";

export type SegmentEvent = {
  kind: "segment";
  strokeId: string;
  authorId: string;
  tool: WhiteboardToolKind;
  color: string | null;
  width: number;
  points: WhiteboardStrokePoint[];
};
export type StrokeCompleteEvent = {
  kind: "stroke_complete";
  strokeId: string;
  authorId: string;
  tool: WhiteboardToolKind;
  color: string | null;
  width: number;
  points: WhiteboardStrokePoint[];
  createdAt: string;
};
type WhiteboardWireEvent =
  | SegmentEvent
  | StrokeCompleteEvent
  | { kind: "board_cleared"; clearedBy: string; clearedAt: string }
  | { kind: "stroke_removed"; strokeId: string; removedBy: string };

type WhiteboardSocketHandlers = {
  onSegment: (event: SegmentEvent) => void;
  onStrokeComplete: (event: StrokeCompleteEvent) => void;
  onBoardCleared: () => void;
  onStrokeRemoved: (strokeId: string) => void;
  /** Mismo criterio que onReconnected en useRoomSocket.ts — STOMP no reentrega lo perdido
   * mientras el socket estuvo caído, así que una reconexión necesita re-hidratar el historial
   * entero por REST (lo hace el caller, esto solo avisa cuándo). */
  onReconnected: () => void;
};

/** Dibujo en vivo de la pizarra colaborativa — mismo `@stomp/stompjs` Client y mismo patrón de
 * ciclo de vida que useRoomSocket.ts (mensajes/typing de una sala de chat), un hook nuevo en vez
 * de generalizar el existente porque el shape de eventos y los destinos son totalmente distintos. */
export function useWhiteboardSocket(communityId: string | undefined, handlers: WhiteboardSocketHandlers) {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);
  // Los handlers son closures inline del caller (WhiteboardCanvas), cambian de identidad en
  // cada render — una ref evita reconectar el socket por eso (mismo criterio que el comentario
  // de "actions" en useRoomSocket.ts).
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!communityId) return;
    const session = getCachedSession();
    if (!session) return;

    let hasConnectedBefore = false;
    const client = new Client({
      brokerURL: wsUrl(),
      connectHeaders: { Authorization: `Bearer ${session.accessToken}` },
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        if (hasConnectedBefore) handlersRef.current.onReconnected();
        hasConnectedBefore = true;

        client.subscribe(`/topic/communities/${communityId}/whiteboard`, (frame) => {
          const event = JSON.parse(frame.body) as WhiteboardWireEvent;
          switch (event.kind) {
            case "segment":
              handlersRef.current.onSegment(event);
              break;
            case "stroke_complete":
              handlersRef.current.onStrokeComplete(event);
              break;
            case "board_cleared":
              handlersRef.current.onBoardCleared();
              break;
            case "stroke_removed":
              handlersRef.current.onStrokeRemoved(event.strokeId);
              break;
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onWebSocketClose: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [communityId]);

  const sendSegment = useCallback(
    (payload: { strokeId: string; tool: WhiteboardToolKind; color: string | null; width: number; points: WhiteboardStrokePoint[] }) => {
      const client = clientRef.current;
      if (!client?.connected || !communityId || payload.points.length === 0) return;
      client.publish({ destination: `/app/communities/${communityId}/whiteboard/segment`, body: JSON.stringify(payload) });
    },
    [communityId]
  );

  const sendStrokeComplete = useCallback(
    (payload: { strokeId: string; tool: WhiteboardToolKind; color: string | null; width: number; points: WhiteboardStrokePoint[] }) => {
      const client = clientRef.current;
      if (!client?.connected || !communityId || payload.points.length === 0) return;
      client.publish({ destination: `/app/communities/${communityId}/whiteboard/stroke`, body: JSON.stringify(payload) });
    },
    [communityId]
  );

  const sendUndo = useCallback(() => {
    const client = clientRef.current;
    if (!client?.connected || !communityId) return;
    client.publish({ destination: `/app/communities/${communityId}/whiteboard/undo`, body: "{}" });
  }, [communityId]);

  return { connected, sendSegment, sendStrokeComplete, sendUndo };
}
