"use client";

import { useEffect } from "react";

/**
 * 100dvh no alcanza en Android: la barra de direcciones sí la contempla, pero el teclado virtual
 * no la achica (el teclado se trata como un overlay, no como una reducción del viewport dinámico).
 * Con `interactiveWidget: "resizes-visual"` en el viewport meta (ver app/layout.tsx), abrir el
 * teclado SÍ achica `window.visualViewport.height` sin tocar el layout viewport — este hook
 * refleja ese valor en la variable CSS --app-height, que el layout del chat usa en vez de dvh para
 * que el composer quede siempre pegado arriba del teclado, no en un punto arbitrario del documento.
 */
export function useAppHeight() {
  useEffect(() => {
    const vv = window.visualViewport;

    function update() {
      const height = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-height", `${height}px`);
    }

    update();

    if (vv) {
      vv.addEventListener("resize", update);
      vv.addEventListener("scroll", update);
      return () => {
        vv.removeEventListener("resize", update);
        vv.removeEventListener("scroll", update);
      };
    }

    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
}
