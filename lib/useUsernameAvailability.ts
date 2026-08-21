"use client";

import { useEffect, useState } from "react";

import { usersApi } from "@/lib/api";

export type UsernameAvailabilityStatus = "idle" | "too-short" | "checking" | "available" | "taken" | "error";

// Mismo mínimo que OnboardingRequest.username en menzoapi (@Size(min = 3, max = 20)) — chequear
// acá antes de pegarle a la red evita un round-trip por cada tecla mientras la persona todavía
// está escribiendo las primeras letras.
const MIN_LENGTH = 3;

/** Chequeo en vivo contra GET /api/users/username-available (ver UserService.usernameAvailable en
 * menzoapi), debounced 300ms — mismo patrón que useCommunitySearch en app/(app)/search/page.tsx.
 * `currentUsername` es el nickname actual de la persona (edición de perfil) — evita el
 * ida-y-vuelta de red si no tocó nada. */
export function useUsernameAvailability(username: string, currentUsername?: string): UsernameAvailabilityStatus {
  const [status, setStatus] = useState<UsernameAvailabilityStatus>("idle");

  useEffect(() => {
    const trimmed = username.trim();
    if (currentUsername && trimmed.toLowerCase() === currentUsername.toLowerCase()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia el estado de un chequeo anterior, mismo criterio que useCommunitySearch.
      setStatus("idle");
      return;
    }
    if (trimmed.length < MIN_LENGTH) {
      setStatus(trimmed.length === 0 ? "idle" : "too-short");
      return;
    }
    let cancelled = false;
    setStatus("checking");
    const timer = setTimeout(() => {
      usersApi
        .usernameAvailable(trimmed)
        .then((res) => {
          if (!cancelled) setStatus(res.available ? "available" : "taken");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [username, currentUsername]);

  return status;
}
