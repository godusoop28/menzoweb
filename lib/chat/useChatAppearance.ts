"use client";

import { useCallback, useState } from "react";

import { getMyRealId } from "@/lib/api/session";

import {
  DEFAULT_CHAT_APPEARANCE,
  getChatAppearance,
  resetChatAppearance,
  setChatAppearance,
  type ChatAppearancePrefs,
} from "./chatAppearance";

/** Hook de consumo de la apariencia personal de una sala — punto único que ChatBubble y el
 * fondo del chat room deben usar (no leer localStorage a mano en cada componente). Guarda las
 * prefs en estado local (no solo el valor derivado) para no depender de un contador de versión
 * que el linter de exhaustive-deps no puede verificar contra una lectura externa (localStorage). */
export function useChatAppearance(roomId: string | null | undefined) {
  const [prefs, setPrefsState] = useState<ChatAppearancePrefs>(() => {
    const userId = getMyRealId();
    return userId && roomId ? getChatAppearance(userId, roomId) : DEFAULT_CHAT_APPEARANCE;
  });
  const [loadedFor, setLoadedFor] = useState(roomId);

  // Cambiar de sala re-lee sin useEffect: si loadedFor no coincide con roomId todavía, se
  // recalcula en el mismo render (patrón "adjust state during render" de React) en vez de un
  // useEffect que dispararía un render extra después de montar con las prefs de la sala vieja.
  if (loadedFor !== roomId) {
    const userId = getMyRealId();
    setPrefsState(userId && roomId ? getChatAppearance(userId, roomId) : DEFAULT_CHAT_APPEARANCE);
    setLoadedFor(roomId);
  }

  const update = useCallback(
    (patch: Partial<ChatAppearancePrefs>) => {
      const userId = getMyRealId();
      if (!userId || !roomId) return;
      setPrefsState(setChatAppearance(userId, roomId, patch));
    },
    [roomId]
  );

  const reset = useCallback(() => {
    const userId = getMyRealId();
    if (!userId || !roomId) return;
    resetChatAppearance(userId, roomId);
    setPrefsState(DEFAULT_CHAT_APPEARANCE);
  }, [roomId]);

  return { prefs, setPrefs: update, reset };
}
