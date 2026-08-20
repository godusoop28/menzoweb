import type { CommunityNavigationConfig, CommunityThemeConfig } from "@/lib/api/types";

/**
 * El backend REEMPLAZA themeConfig/navigationConfig completos en cada PATCH (no hace merge del
 * lado del servidor — ver UpdateCommunityThemeRequest/UpdateCommunityNavigationRequest). Todo
 * editor debe partir siempre del snapshot completo ya cargado y aplicar el cambio sobre una
 * copia; nunca mandar un subconjunto de claves o se pierden las que no se estaban editando.
 * Estos helpers formalizan ese único patrón para que no se reimplemente distinto en cada editor.
 */
export function mergeThemeConfig(current: CommunityThemeConfig, patch: Partial<CommunityThemeConfig>): CommunityThemeConfig {
  return { ...current, ...patch };
}

export function mergeNavigationConfig(
  current: CommunityNavigationConfig,
  patch: CommunityNavigationConfig
): CommunityNavigationConfig {
  return { ...current, ...patch };
}
