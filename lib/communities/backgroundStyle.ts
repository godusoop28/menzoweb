import type { CSSProperties } from "react";

import type { CommunitySummaryDto } from "@/lib/api/types";

/**
 * Gradiente de respaldo instantáneo con los colores de marca de la comunidad, o undefined si no
 * tiene ninguno configurado.
 *
 * `activeCommunityDetail` (que trae themeConfig.*BackgroundUrl, la imagen real) es un fetch
 * aparte, más lento que `activeCommunity` (el summary, ya disponible con la lista de
 * membresías) — durante esa ventana, o si la comunidad nunca subió una imagen, antes no había
 * ningún fondo: el panel (nav/feed/chat) se veía negro liso. primaryColor/secondaryColor sí
 * vienen en el summary, así que sirven de fondo instantáneo.
 */
export function communityFallbackGradient(community: CommunitySummaryDto | null | undefined): string | undefined {
  const primary = community?.primaryColor;
  const secondary = community?.secondaryColor;
  if (!primary && !secondary) return undefined;
  return `linear-gradient(165deg, ${primary ?? "#232838"}, ${secondary ?? "#11141b"})`;
}

/** Fondo temático simple (nav) — imagen (si ya cargó) sobre el gradiente de respaldo, ambos
 * como capas del mismo `background-image` para que el gradiente se vea de inmediato y la
 * imagen pinte encima sola en cuanto esté lista, sin dejar un hueco negro mientras tanto. */
export function communityBackgroundStyle(
  community: CommunitySummaryDto | null | undefined,
  imageUrl: string | null | undefined
): CSSProperties | undefined {
  const gradient = communityFallbackGradient(community);
  if (!imageUrl && !gradient) return undefined;

  return {
    backgroundImage: [imageUrl ? `url(${imageUrl})` : null, gradient].filter(Boolean).join(", "),
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
