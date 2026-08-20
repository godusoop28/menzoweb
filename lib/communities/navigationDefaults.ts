import type { CommunityNavigationConfig, CommunityNavigationSectionKey } from "@/lib/api/types";

export const NAV_SECTION_DEFAULTS: { key: CommunityNavigationSectionKey; label: string; order: number }[] = [
  { key: "home", label: "Inicio", order: 1 },
  { key: "posts", label: "Publicaciones", order: 2 },
  { key: "blogs", label: "Blogs", order: 3 },
  { key: "chats", label: "Chats", order: 4 },
  { key: "live", label: "LIVE", order: 5 },
  { key: "members", label: "Miembros", order: 6 },
  { key: "events", label: "Eventos", order: 7 },
  { key: "about", label: "Información", order: 8 },
];

/** Completa las secciones ausentes del mapa con sus defaults (habilitada, orden y label de
 * fábrica) — usado tanto por el editor de apariencia como por la navegación contextual real, para
 * que ambos vean exactamente el mismo conjunto de secciones "conocidas". */
export function withNavDefaults(config: CommunityNavigationConfig): CommunityNavigationConfig {
  const next: CommunityNavigationConfig = { ...config };
  for (const { key, label, order } of NAV_SECTION_DEFAULTS) {
    if (!next[key]) next[key] = { enabled: true, order, label };
  }
  return next;
}
