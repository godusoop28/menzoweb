import { API_BASE_URL } from "./config";
import { clearSession, getCachedSession, saveSession } from "./session";
import type { AuthResponseDto, ErrorResponse } from "./types";

export class ApiError extends Error {
  status: number;
  fieldErrors: Record<string, string> | null;
  /** Código estable del backend (p. ej. "YOUTUBE_QUOTA_EXCEEDED") — null si no vino uno o si la
   * falla fue de red/timeout local (nunca llegó a golpear al backend). */
  code: string | null;
  /** Solo viene en 429 (MENZI_DJ_RATE_LIMITED) — null en cualquier otro caso. */
  retryAfterSeconds: number | null;

  constructor(
    status: number,
    message: string,
    fieldErrors: Record<string, string> | null = null,
    code: string | null = null,
    retryAfterSeconds: number | null = null
  ) {
    super(message);
    this.status = status;
    this.fieldErrors = fieldErrors;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
  /** No adjunta el Bearer aunque haya sesión (solo auth/register, auth/login, auth/refresh). */
  skipAuth?: boolean;
};

const HARD_TIMEOUT_MS = 4 * 60 * 1000;

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function onSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

const NETWORK_RETRY_DELAYS_MS = [1000, 3000];

function isNetworkError(e: unknown): boolean {
  return e instanceof Error && e.name !== "AbortError";
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let refreshPromise: Promise<boolean> | null = null;

async function doRefresh(): Promise<boolean> {
  const session = getCachedSession();
  if (!session) return false;
  try {
    // Pasa por apiFetch (no por fetch crudo) para heredar los reintentos de red y el margen de
    // 4 minutos que ya usan el resto de las peticiones: sin esto, un blip de red puntual podía
    // hacer fallar este refresh y desloguear a alguien con una sesión perfectamente válida.
    const data = await apiFetch<AuthResponseDto>("/api/auth/refresh", {
      method: "POST",
      body: { refreshToken: session.refreshToken },
      skipAuth: true,
    });
    saveSession({ accessToken: data.accessToken, refreshToken: data.refreshToken, userId: data.profile.id });
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, formData, skipAuth } = options;

  async function attempt(): Promise<Response> {
    const session = getCachedSession();
    const headers: Record<string, string> = {};
    if (!formData) headers["Content-Type"] = "application/json";
    if (!skipAuth && session?.accessToken) headers.Authorization = `Bearer ${session.accessToken}`;

    const controller = new AbortController();
    const hardTimeout = setTimeout(() => controller.abort(), HARD_TIMEOUT_MS);
    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(hardTimeout);
    }
  }

  async function attemptWithRetries(): Promise<Response> {
    try {
      return await attempt();
    } catch (e) {
      for (const delay of NETWORK_RETRY_DELAYS_MS) {
        if (!isNetworkError(e)) break;
        await sleep(delay);
        try {
          return await attempt();
        } catch (retryError) {
          e = retryError;
        }
      }
      if (e instanceof Error && e.name === "AbortError") {
        throw new ApiError(0, "Menzo tardó demasiado en responder. Inténtalo de nuevo en un momento.");
      }
      throw new ApiError(0, "No se pudo conectar con el servidor. Revisa tu conexión.");
    }
  }

  let response = await attemptWithRetries();

  if (response.status === 401 && !skipAuth && getCachedSession()) {
    const refreshed = await refreshOnce();
    if (refreshed) {
      response = await attemptWithRetries();
    } else {
      clearSession();
      sessionExpiredListeners.forEach((listener) => listener());
    }
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  // Si algo delante del backend (proxy, CDN, balanceador) responde con una página de error que
  // no es JSON — un 502/503/504 HTML, un timeout de gateway, un bloqueo de WAF — esto tiraba un
  // SyntaxError sin capturar en ningún lado: no un ApiError con mensaje legible, una excepción
  // cruda que rompía cualquier flujo async que estuviera esperando esta respuesta (p. ej. iniciar
  // o unirse a un LIVE) en vez de mostrar un error manejable.
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    throw new ApiError(
      response.status,
      response.ok ? "Menzo devolvió una respuesta inesperada. Inténtalo de nuevo en un momento." : `Error ${response.status}`
    );
  }

  if (!response.ok) {
    const err = data as ErrorResponse | undefined;
    throw new ApiError(
      response.status,
      err?.message ?? `Error ${response.status}`,
      err?.fieldErrors ?? null,
      err?.code ?? null,
      err?.retryAfterSeconds ?? null
    );
  }

  return data as T;
}
