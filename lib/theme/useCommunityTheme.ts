"use client";

import { useMemo } from "react";

import { useAccessibilityPrefs } from "@/lib/AccessibilityPrefsContext";
import { useCommunity } from "@/lib/communities/CommunityContext";

import { resolveCommunityTheme, type ResolvedCommunityTheme } from "./communityTheme";

/** Punto único de consumo del tema de comunidad para componentes cliente — envuelve
 * `useCommunity()` + el resolver puro, memoizado por identidad de summary/detail. También
 * inyecta la preferencia de accesibilidad "reducir fondos personalizados" del dispositivo. */
export function useCommunityTheme(): ResolvedCommunityTheme {
  const { activeCommunity, activeCommunityDetail } = useCommunity();
  const { prefs } = useAccessibilityPrefs();
  return useMemo(
    () => resolveCommunityTheme(activeCommunity, activeCommunityDetail, prefs.reduceCustomBackgrounds),
    [activeCommunity, activeCommunityDetail, prefs.reduceCustomBackgrounds]
  );
}
