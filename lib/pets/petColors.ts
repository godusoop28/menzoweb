import type { MenzoPetColors } from "@/components/pets/MenzoPet";

/** Fallbacks razonables si al backend le falta algún token (no debería pasar en uso normal, pero
 * PetDto.colors/PetSpeciesResponse.defaultColors llegan como Record<string,string> sin garantía
 * de tipo en tiempo de compilación). Mismos valores que manifest.json.species.kitsu.defaultColors
 * + accessoryPrimary/Secondary/effect del manifest. */
const FALLBACK: MenzoPetColors = {
  primary: "#FF7A1A",
  secondary: "#FFE7CF",
  markings: "#FFB53A",
  eyes: "#7B4DFF",
  outline: "#17111E",
  hair: "#2B2234",
  accessoryPrimary: "#17131F",
  accessorySecondary: "#3B285C",
  accessoryAccent: "#FF7A1A",
  effect: "#8A55FF",
};

export function petColorsToProps(colors: Record<string, string>): MenzoPetColors {
  return {
    primary: colors.primary ?? FALLBACK.primary,
    secondary: colors.secondary ?? FALLBACK.secondary,
    markings: colors.markings ?? FALLBACK.markings,
    eyes: colors.eyes ?? FALLBACK.eyes,
    outline: colors.outline ?? FALLBACK.outline,
    hair: colors.hair ?? FALLBACK.hair,
    accessoryPrimary: colors.accessoryPrimary ?? FALLBACK.accessoryPrimary,
    accessorySecondary: colors.accessorySecondary ?? FALLBACK.accessorySecondary,
    accessoryAccent: colors.accessoryAccent ?? FALLBACK.accessoryAccent,
    effect: colors.effect ?? FALLBACK.effect,
  };
}
