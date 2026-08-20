import type { CSSProperties } from "react";

import type { CommunityDetailDto, CommunitySummaryDto } from "@/lib/api/types";
import { communityFallbackGradient } from "@/lib/communities/backgroundStyle";
import { Colors, MenzoTokens } from "@/lib/theme";

/** Opacidad de oscurecido usada hoy tanto por el scrim del sidebar (AppShell) como por el fondo
 * del feed — se mantiene como default para no producir un cambio visual al introducir el
 * resolver; una comunidad puede pisarlo con themeConfig.backgroundOverlay. */
const DEFAULT_OVERLAY = 0.88;

export type ResolvedSurface = {
  imageUrl: string | undefined;
  overlay: number;
  /** Listo para spread en `style` — incluye el overlay de legibilidad ya compuesto sobre la
   * imagen/gradiente, o `undefined` si la comunidad no configuró nada (la pantalla cae a su
   * fondo base de Menzo sin hacer nada especial). */
  style: CSSProperties | undefined;
};

export type ResolvedCommunityTheme = {
  hasTheme: boolean;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  /** Nuevo: de detail.textColor/surfaceColor, con fallback a MenzoTokens — no se leían antes
   * aunque ya existían como campos directos del DTO. */
  textColor: string;
  surfaceColor: string;
  nav: ResolvedSurface;
  feed: ResolvedSurface;
  /** Fondo/textura de la navegación CONTEXTUAL de la comunidad (no la navegación global de
   * Menzo). Lee themeConfig.navigationBackgroundUrl; si la comunidad solo configuró el alias
   * legado navBackgroundUrl (mismo campo que `nav`), también sirve como fallback. */
  navigationBackground: ResolvedSurface;
  /** PNG/asset decorativo en slots seguros — puramente decorativo, sin fallback de gradiente:
   * si no hay imagen configurada, simplemente no hay decoración (a diferencia de nav/feed, que
   * siempre tienen un scrim/gradiente detrás del contenido). */
  overlayDecoration: { imageUrl: string | undefined };
  /** Visual flexible para hero secundarios, eventos, cards destacadas o identidad de secciones
   * como DJ Menzi — no exclusivo de ningún módulo. Mismo criterio sin-fallback que overlayDecoration. */
  featuredVisual: { imageUrl: string | undefined };
  /** Banner/anuncio horizontal — de detail.bannerUrl, campo directo del DTO que hasta ahora
   * ningún componente resolvía. */
  banner: { imageUrl: string | undefined };
  layoutPreset: string | undefined;
  headerStyle: string | undefined;
  cardStyle: string | undefined;
  density: string | undefined;
};

function resolveOverlay(themeConfig: CommunityDetailDto["themeConfig"] | undefined): number {
  const raw = themeConfig?.backgroundOverlay;
  return typeof raw === "number" && raw >= 0 && raw <= 1 ? raw : DEFAULT_OVERLAY;
}

/** Piso de oscurecido propio de la barra lateral, más alto que el que la comunidad configura para
 * el hero del feed (`overlay` a secas). El feed muestra su arte una sola vez, grande, con texto
 * grande encima — un overlay bajo se ve "épico" ahí. La sidebar es al revés: nav de texto chico,
 * siempre visible, en cualquier pantalla — la misma imagen con el mismo overlay bajo se vuelve un
 * patrón ruidoso detrás de "Inicio/Chats/Miembros" y rompe la legibilidad. Ninguna referencia de
 * diseño muestra la sidebar así de "cargada"; siempre es oscura y discreta.
 *
 * 0.85 no alcanza con imágenes muy saturadas/brillantes (fan-art neón, capturas con blancos
 * puros): al 12% de opacidad remanente el patrón seguía leyéndose con claridad. 0.94 deja como
 * mucho un 6% de la imagen original — suficiente para dar "mood"/color de marca sin nunca
 * competir con el texto de la nav, sea cual sea la imagen que suba la comunidad. */
const NAV_OVERLAY_FLOOR = 0.94;

function resolveNavOverlay(themeConfig: CommunityDetailDto["themeConfig"] | undefined): number {
  return Math.max(resolveOverlay(themeConfig), NAV_OVERLAY_FLOOR);
}

function resolveSurface(
  community: CommunitySummaryDto | null | undefined,
  imageUrl: string | undefined,
  overlay: number,
  position: string,
  attachment?: "fixed"
): ResolvedSurface {
  const gradient = communityFallbackGradient(community);
  if (!imageUrl && !gradient) {
    return { imageUrl: undefined, overlay, style: undefined };
  }
  const layers = [`linear-gradient(rgba(7,9,13,${overlay}), rgba(7,9,13,${overlay}))`, imageUrl ? `url(${imageUrl})` : null, gradient]
    .filter(Boolean)
    .join(", ");
  return {
    imageUrl,
    overlay,
    style: {
      backgroundImage: layers,
      backgroundSize: "cover",
      backgroundPosition: position,
      ...(attachment ? { backgroundAttachment: attachment } : {}),
    },
  };
}

/**
 * Theme resolver central: Menzo defaults -> apariencia de comunidad (CommunityDetailDto) ->
 * themeConfig -> fallback seguro. Ninguna pantalla debe volver a leer themeConfig/colores a
 * mano; todas consumen esta salida (o el hook `useCommunityTheme`) para que agregar una nueva
 * superficie temática (p. ej. chat) sea extender esta función, no repartir ifs por 30 archivos.
 *
 * `community` es el summary (rápido, siempre disponible con las membresías); `detail` es el
 * fetch más lento que trae themeConfig/navigationConfig — puede ser null mientras carga o si
 * falló, y el resolver debe seguir devolviendo algo usable en ese caso.
 *
 * `reduceCustomBackgrounds` viene de la preferencia de accesibilidad del dispositivo (ver
 * AccessibilityPrefsContext) — cuando es true, toda superficie con imagen colapsa a su fallback
 * de color/gradiente, como si la comunidad nunca hubiera configurado esa imagen. La función se
 * mantiene pura: quien llama decide si inyecta esa preferencia.
 */
export function resolveCommunityTheme(
  community: CommunitySummaryDto | null | undefined,
  detail: CommunityDetailDto | null | undefined,
  reduceCustomBackgrounds = false
): ResolvedCommunityTheme {
  const themeConfig = detail?.themeConfig;
  const overlay = resolveOverlay(themeConfig);
  const navOverlay = resolveNavOverlay(themeConfig);

  const rawNavImage = (themeConfig?.navigationBackgroundUrl as string | undefined) || (themeConfig?.navBackgroundUrl as string | undefined) || undefined;
  const rawFeedImage = (themeConfig?.feedBackgroundUrl as string | undefined) || detail?.backgroundUrl || undefined;
  const rawOverlayDecoration = (themeConfig?.overlayDecorationUrl as string | undefined) || undefined;
  const rawFeaturedVisual = (themeConfig?.featuredVisualUrl as string | undefined) || undefined;
  const rawBanner = detail?.bannerUrl || undefined;

  const navImage = reduceCustomBackgrounds ? undefined : rawNavImage;
  const feedImage = reduceCustomBackgrounds ? undefined : rawFeedImage;
  const overlayDecorationImage = reduceCustomBackgrounds ? undefined : rawOverlayDecoration;
  const featuredVisualImage = reduceCustomBackgrounds ? undefined : rawFeaturedVisual;
  const bannerImage = reduceCustomBackgrounds ? undefined : rawBanner;

  return {
    hasTheme: !!(community?.primaryColor || community?.secondaryColor || rawNavImage || rawFeedImage),
    primaryColor: detail?.primaryColor || community?.primaryColor || Colors.orange,
    secondaryColor: detail?.secondaryColor || community?.secondaryColor || Colors.coral,
    accentColor: detail?.accentColor || Colors.orange,
    textColor: detail?.textColor || MenzoTokens.textPrimary,
    surfaceColor: detail?.surfaceColor || MenzoTokens.surface,
    nav: resolveSurface(community, navImage, navOverlay, "center"),
    feed: resolveSurface(community, feedImage, overlay, "top center", "fixed"),
    navigationBackground: resolveSurface(community, navImage, navOverlay, "center"),
    overlayDecoration: { imageUrl: overlayDecorationImage },
    featuredVisual: { imageUrl: featuredVisualImage },
    banner: { imageUrl: bannerImage },
    layoutPreset: themeConfig?.layoutPreset as string | undefined,
    headerStyle: themeConfig?.headerStyle as string | undefined,
    cardStyle: themeConfig?.cardStyle as string | undefined,
    density: themeConfig?.density as string | undefined,
  };
}
