"use client";

import { useEffect, useState } from "react";

/**
 * El backend (Render free-tier, ver README de menzoapi) se duerme sin tráfico y el primer
 * request tras despertarlo puede tardar varios segundos — el botón ya muestra un spinner
 * (GradientButton `loading`), pero nada le decía al usuario *por qué* tardaba tanto, así que una
 * espera normal-para-cold-start se sentía como que la app se había colgado. Este hook arma ese
 * mensaje después de `delayMs` de loading sostenido — no aparece en un login/registro rápido
 * contra un servidor ya despierto, solo cuando de verdad se está tardando.
 */
export function useWakingHint(loading: boolean, delayMs = 2500) {
  const [showHint, setShowHint] = useState(false);
  // "Ajustar estado durante el render" en vez de un setState síncrono al abrir el effect de abajo
  // (mismo patrón que app/(app)/page.tsx para blogsLoading) — apaga el hint apenas loading vuelve
  // a false, sin esperar a que el effect de abajo se re-ejecute.
  const [trackedLoading, setTrackedLoading] = useState(loading);
  if (loading !== trackedLoading) {
    setTrackedLoading(loading);
    if (!loading) setShowHint(false);
  }

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setShowHint(true), delayMs);
    return () => clearTimeout(timer);
  }, [loading, delayMs]);

  return showHint;
}
