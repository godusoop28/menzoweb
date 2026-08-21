"use client";

import { createContext, useContext, useMemo } from "react";

import { Gradients, type GradientId } from "@/lib/theme";

type AccentContextValue = {
  color: string;
  gradient: (typeof Gradients)[GradientId];
  gradientId: GradientId;
};

// Antes esto se derivaba de profile.aura (el "aura" que la persona elegía en onboarding) — ver
// sección "eliminar aura" del pedido: ya no existe ninguna selección personal acá, así que el
// acento queda fijo en el degradado de marca por defecto para todos.
const DEFAULT_GRADIENT_ID: GradientId = "fire";

const AccentContext = createContext<AccentContextValue | null>(null);

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<AccentContextValue>(() => {
    const gradient = Gradients[DEFAULT_GRADIENT_ID];
    return { color: gradient[0], gradient, gradientId: DEFAULT_GRADIENT_ID };
  }, []);

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>;
}

export function useAccent() {
  const ctx = useContext(AccentContext);
  if (!ctx) throw new Error("useAccent must be used within an AccentProvider");
  return ctx;
}
