"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef } from "react";

/** Mismo orden que FALLBACK_NAV_ITEMS en AppShell.tsx — Inicio/Comunidad/Chats/Perfil, "Crear"
 * nunca es una página deslizable (queda como acción de footer aparte). */
const SWIPE_ROUTES = ["/", "/members", "/chat", "/profile"];

const DISTANCE_THRESHOLD_PX = 70;
const MAX_DURATION_MS = 900;
// Un gesto necesita moverse claramente más en horizontal que en vertical para contar como swipe
// de navegación — evita que un scroll vertical con algo de deriva lateral dispare una página.
const HORIZONTAL_DOMINANCE = 1.5;

/** Swipe táctil liviano entre las 4 secciones principales — a diferencia de la versión móvil
 * (PageView que sigue el dedo en tiempo real, ver menzomovil/main_tab_shell.dart), acá solo se
 * OBSERVA el gesto completo (sin `preventDefault` ni `setPointerCapture`) y se navega recién al
 * soltar si fue un swipe horizontal claro — el scroll vertical nativo del navegador nunca se
 * toca, y cualquier contenido con su propio scroll horizontal (carruseles, el Pizarrón) se
 * excluye marcándolo con `data-no-swipe-nav`. Solo reacciona a punteros táctiles — mouse/trackpad
 * no dispara nada (en desktop el nav/sidebar ya alcanza, no hace falta arrastrar). */
export function useSwipeNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const startRef = useRef<{ x: number; y: number; t: number; pointerId: number; ignore: boolean } | null>(null);

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "touch") return;
    const target = e.target as HTMLElement;
    const ignore = !!target.closest?.("[data-no-swipe-nav]");
    startRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), pointerId: e.pointerId, ignore };
  }

  function onPointerUp(e: React.PointerEvent) {
    const start = startRef.current;
    startRef.current = null;
    if (!start || start.ignore || start.pointerId !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Date.now() - start.t > MAX_DURATION_MS) return;
    if (Math.abs(dx) < DISTANCE_THRESHOLD_PX) return;
    if (Math.abs(dx) < Math.abs(dy) * HORIZONTAL_DOMINANCE) return;

    const currentIndex = SWIPE_ROUTES.indexOf(pathname);
    if (currentIndex === -1) return; // ruta que no es una de las 4 pestañas (sala de chat, etc.)
    const nextIndex = currentIndex + (dx < 0 ? 1 : -1);
    if (nextIndex < 0 || nextIndex >= SWIPE_ROUTES.length) return;
    router.push(SWIPE_ROUTES[nextIndex]);
  }

  function onPointerCancel() {
    startRef.current = null;
  }

  return { onPointerDown, onPointerUp, onPointerCancel };
}
