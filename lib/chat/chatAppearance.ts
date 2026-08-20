import { chatAppearanceKey, getItem, removeItem, setItem } from "@/lib/storage";

/** Estilo de una burbuja (entrante o saliente). "default" preserva exactamente el color/tinte
 * que ya se calcula hoy en ChatBubble (accent de la comunidad / tono neutro) — el usuario solo
 * pisa ese default cuando elige "solid" o "gradient" explícitamente. */
export type BubbleStyle = {
  mode: "default" | "solid" | "gradient";
  color?: string;
  gradient?: string;
};

/**
 * Apariencia de chat personal por usuario+sala. Es 100% local: nunca se envía a menzoapi. Dos
 * personas en la misma sala pueden ver wallpapers/burbujas distintos, y esto NO debe tocar
 * ChatRoom.backgroundUri (el fondo compartido que sí administra el owner/co-host de la sala vía
 * RoomSettingsPanel) — ver la nota de precedencia en app/(app)/chat/[id]/page.tsx.
 *
 * Tampoco tiene relación con themeConfig.chatBackgroundUrl (fondo de la LISTA de chats de una
 * comunidad, administrado por líderes) — son sistemas completamente independientes a propósito.
 */
export type ChatAppearancePrefs = {
  schemaVersion: 1;
  wallpaperUrl?: string;
  wallpaperOpacity: number;
  outgoingBubble: BubbleStyle;
  incomingBubble: BubbleStyle;
  bubbleOpacity: number;
  textScale: number;
  compactMode: boolean;
  showAvatars: boolean;
};

export const DEFAULT_CHAT_APPEARANCE: ChatAppearancePrefs = {
  schemaVersion: 1,
  wallpaperUrl: undefined,
  wallpaperOpacity: 1,
  outgoingBubble: { mode: "default" },
  incomingBubble: { mode: "default" },
  bubbleOpacity: 1,
  textScale: 1,
  compactMode: false,
  showAvatars: true,
};

export function getChatAppearance(userId: string, roomId: string): ChatAppearancePrefs {
  const stored = getItem<ChatAppearancePrefs>(chatAppearanceKey(userId, roomId));
  if (!stored) return DEFAULT_CHAT_APPEARANCE;
  // Merge sobre los defaults para tolerar prefs guardadas antes de agregar un campo nuevo.
  return { ...DEFAULT_CHAT_APPEARANCE, ...stored };
}

export function setChatAppearance(userId: string, roomId: string, patch: Partial<ChatAppearancePrefs>): ChatAppearancePrefs {
  const next: ChatAppearancePrefs = { ...getChatAppearance(userId, roomId), ...patch, schemaVersion: 1 };
  setItem(chatAppearanceKey(userId, roomId), next);
  return next;
}

/** "Restablecer" borra la clave en vez de reescribir los defaults, así una futura corrección de
 * un default no queda "congelada" para usuarios que ya restablecieron. */
export function resetChatAppearance(userId: string, roomId: string): void {
  removeItem(chatAppearanceKey(userId, roomId));
}
