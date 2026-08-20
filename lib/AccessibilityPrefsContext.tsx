"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { getItem, setItem, StorageKeys } from "@/lib/storage";

export type AccessibilityPrefs = {
  /** Colapsa cualquier imagen personalizada (tema de comunidad + wallpaper de chat personal) a
   * su fallback de color/gradiente. */
  reduceCustomBackgrounds: boolean;
  /** Fuerza el mismo comportamiento que `@media (prefers-reduced-motion: reduce)` en
   * app/globals.css aunque el sistema operativo no lo tenga activado. */
  reduceMotion: boolean;
};

const DEFAULT_PREFS: AccessibilityPrefs = {
  reduceCustomBackgrounds: false,
  reduceMotion: false,
};

type AccessibilityPrefsContextValue = {
  prefs: AccessibilityPrefs;
  setPrefs: (patch: Partial<AccessibilityPrefs>) => void;
};

const AccessibilityPrefsContext = createContext<AccessibilityPrefsContextValue | null>(null);

/**
 * Preferencias de accesibilidad, POR DISPOSITIVO (no por usuario) — mismo criterio que
 * `menzo.djEnabled` en MenziDjContext: quien usa el dispositivo ahora mismo es quien las
 * necesita, y no deben reactivarse silenciosamente al cambiar de cuenta en un equipo
 * compartido. A diferencia de ChatAppearancePrefs (expresión personal ligada a identidad), no
 * hay nada sensible en que un dispositivo recuerde esto entre cuentas.
 */
export function AccessibilityPrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<AccessibilityPrefs>(() => {
    const stored = getItem<AccessibilityPrefs>(StorageKeys.accessibilityPrefs);
    return stored ? { ...DEFAULT_PREFS, ...stored } : DEFAULT_PREFS;
  });

  useEffect(() => {
    document.documentElement.toggleAttribute("data-reduce-motion", prefs.reduceMotion);
  }, [prefs.reduceMotion]);

  const value = useMemo<AccessibilityPrefsContextValue>(
    () => ({
      prefs,
      setPrefs: (patch) => {
        setPrefsState((current) => {
          const next = { ...current, ...patch };
          setItem(StorageKeys.accessibilityPrefs, next);
          return next;
        });
      },
    }),
    [prefs]
  );

  return <AccessibilityPrefsContext.Provider value={value}>{children}</AccessibilityPrefsContext.Provider>;
}

export function useAccessibilityPrefs() {
  const ctx = useContext(AccessibilityPrefsContext);
  if (!ctx) throw new Error("useAccessibilityPrefs must be used within an AccessibilityPrefsProvider");
  return ctx;
}
