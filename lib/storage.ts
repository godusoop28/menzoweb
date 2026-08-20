export function getItem<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full/unavailable — not fatal, state just won't persist across reloads
  }
}

export function removeItem(key: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
}

export const StorageKeys = {
  auth: "menzo.auth",
  profile: "menzo.profile",
  onboarding: "menzo.onboardingCompleted",
  // Compartida entre CommunityContext (dueño) y AppStateContext (solo lee, para scopear el
  // snapshot inicial de posts/salas) — ver Contexto §8/§21 del pedido original.
  activeCommunityId: "menzo.activeCommunityId",
  // Prefijo de la apariencia de chat personal por usuario+sala — nunca se envía al backend, ver
  // lib/chat/chatAppearance.ts. La clave real es `${chatAppearancePrefix}.${userId}.${roomId}`.
  chatAppearancePrefix: "menzo.chatAppearance",
  // Preferencias de accesibilidad, por DISPOSITIVO (no por usuario) — ver
  // lib/AccessibilityPrefsContext.tsx.
  accessibilityPrefs: "menzo.accessibilityPrefs",
} as const;

/** Clave de storage para la apariencia personal de una sala — un usuario nunca ve la
 * personalización de otro, y la misma persona puede tener wallpapers distintos en dos salas. */
export function chatAppearanceKey(userId: string, roomId: string): string {
  return `${StorageKeys.chatAppearancePrefix}.${userId}.${roomId}`;
}
