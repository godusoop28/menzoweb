import type { GradientId } from "@/lib/theme";

/** Catálogo de insignias — mismo criterio que interests.ts/auras.ts: espejo estático del seed
 * real del backend (ver V2__seed_reference_data.sql en menzoapi, tabla `badges`), no un fetch a
 * /api/lookups/badges (que existe en lookupsApi pero, siguiendo el patrón ya establecido acá,
 * nunca se usa en runtime). `profile.badges` solo trae ids — esto resuelve nombre/descripción/
 * gradiente para mostrarlos. Un id que no aparezca acá (insignia agregada al backend después de
 * este archivo) simplemente no se renderiza — no se inventa contenido para un id desconocido. */
export type Badge = { id: string; name: string; description: string; gradient: GradientId };

export const badges: Badge[] = [
  { id: "fundador", name: "Fundador del reencuentro", description: "Estuvo aquí desde el primer día.", gradient: "fire" },
  { id: "recien-llegado", name: "Recién llegado", description: "Acaba de volver a casa.", gradient: "community" },
  { id: "narrador", name: "Narrador", description: "Sus historias siempre encuentran lectores.", gradient: "creative" },
  { id: "artista", name: "Alma artista", description: "Comparte lo que otros no se atreven.", gradient: "midnight" },
  { id: "conector", name: "Conector", description: "Une a quienes creían haberse perdido.", gradient: "connection" },
  { id: "veterano", name: "Veterano digital", description: "Recuerda cómo se sentía esta época.", gradient: "fire" },
  { id: "noctambulo", name: "Noctámbulo", description: "Siempre presente después de medianoche.", gradient: "midnight" },
  { id: "guardian", name: "Guardián del muro", description: "Deja huellas que otros recuerdan.", gradient: "community" },
];

export const badgeById = (id: string) => badges.find((b) => b.id === id);
