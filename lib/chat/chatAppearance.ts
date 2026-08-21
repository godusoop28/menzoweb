import { chatAppearanceKey, getItem, removeItem, setItem } from "@/lib/storage";

/**
 * Apariencia de chat personal por usuario+sala. Es 100% local: nunca se envía a menzoapi. Dos
 * personas en la misma sala pueden ver wallpapers distintos, y esto NO debe tocar
 * ChatRoom.backgroundUri (el fondo compartido que sí administra el owner/co-host de la sala vía
 * RoomSettingsPanel) — ver la nota de precedencia en app/(app)/chat/[id]/page.tsx.
 *
 * Tampoco tiene relación con themeConfig.chatBackgroundUrl (fondo de la LISTA de chats de una
 * comunidad, administrado por líderes) — son sistemas completamente independientes a propósito.
 *
 * El color de burbuja NO vive acá a propósito: es una elección única por persona (User.bubbleColor
 * en menzoapi, editable desde /profile/edit) que debe verse igual para todos los que le escriben.
 * Antes existía un override local por sala (outgoingBubble/incomingBubble) que le ganaba a esa
 * elección en la propia pantalla de quien lo hubiera configurado — eso contradecía "así debe
 * salirle a todos", así que se sacó. ChatBubble.tsx ya no lee esos campos aunque queden restos
 * viejos en localStorage de antes de este cambio; simplemente se ignoran.
 */
export type ChatAppearancePrefs = {
  schemaVersion: 1;
  wallpaperUrl?: string;
  wallpaperOpacity: number;
  bubbleOpacity: number;
  textScale: number;
  compactMode: boolean;
  showAvatars: boolean;
};

export const DEFAULT_CHAT_APPEARANCE: ChatAppearancePrefs = {
  schemaVersion: 1,
  wallpaperUrl: undefined,
  wallpaperOpacity: 1,
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
