import { getItem, removeItem, setItem, StorageKeys } from "@/lib/storage";

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  userId: string;
};

let cached: StoredSession | null | undefined;

export function loadSession(): StoredSession | null {
  if (cached !== undefined) return cached;
  cached = getItem<StoredSession>(StorageKeys.auth);
  return cached;
}

export function saveSession(session: StoredSession): void {
  cached = session;
  setItem(StorageKeys.auth, session);
}

export function clearSession(): void {
  cached = null;
  removeItem(StorageKeys.auth);
}

export function getCachedSession(): StoredSession | null {
  if (cached === undefined) return loadSession();
  return cached;
}

export function getMyRealId(): string | null {
  return getCachedSession()?.userId ?? null;
}
