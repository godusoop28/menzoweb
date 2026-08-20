export const Colors = {
  background: "#07090D",
  backgroundDeep: "#030509",
  surface: "#11141B",
  surfaceSecondary: "#171B24",
  surfaceElevated: "#1E2330",
  surfaceSoft: "#242A36",

  border: "#292F3D",
  borderSoft: "rgba(255,255,255,0.08)",
  borderStrong: "rgba(255,255,255,0.16)",

  textPrimary: "#F7F8FC",
  textSecondary: "#B3BAC8",
  textMuted: "#767F91",
  textOnAccent: "#090A0E",

  orange: "#FF7A1A",
  yellow: "#FFBE2E",
  coral: "#FF4F45",
  red: "#F43F5E",
  blue: "#3478F6",
  cyan: "#22D3EE",
  purple: "#8B5CF6",
  violet: "#A855F7",
  green: "#68D391",

  success: "#4ADE80",
  danger: "#FB7185",
  online: "#4ADE80",
  offline: "#6B7280",
} as const;

export const Gradients = {
  fire: ["#FFBE2E", "#FF7A1A", "#FF4F45"],
  connection: ["#3478F6", "#22D3EE"],
  midnight: ["#8B5CF6", "#3478F6", "#22D3EE"],
  creative: ["#FF4F45", "#A855F7", "#3478F6"],
  community: ["#68D391", "#22D3EE", "#3478F6"],
} as const;

export type GradientId = keyof typeof Gradients;

export function gradientCss(id: GradientId, angle = 135) {
  return `linear-gradient(${angle}deg, ${Gradients[id].join(", ")})`;
}

export type LevelTier = {
  color: string;
  gradient?: GradientId;
  glow?: boolean;
};

export function levelTier(level: number): LevelTier {
  if (level >= 30) return { color: Colors.yellow, gradient: "fire", glow: true };
  if (level >= 20) return { color: Colors.orange, gradient: "fire" };
  if (level >= 10) return { color: Colors.purple, gradient: "midnight" };
  if (level >= 5) return { color: Colors.cyan };
  return { color: Colors.borderStrong };
}

export const Radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;

/**
 * Agrupación semántica de `Colors` para el nivel "Menzo global" del theme de tres capas
 * (Menzo global -> tema de comunidad -> apariencia personal de chat). No introduce valores
 * nuevos: reexporta las mismas constantes de `Colors` bajo los nombres que pide la spec de
 * rediseño, para que el resolver de comunidad y las capas de apariencia personal tengan un
 * único vocabulario de fallback. `warning` no existía como concepto propio en `Colors`; se
 * mapea a `Colors.yellow` (mismo tono ya usado para advertencias/nivel alto) en vez de
 * inventar un hex nuevo que pueda desalinearse de `app/globals.css`.
 */
export type MenzoTokens = {
  background: string;
  surface: string;
  surfaceElevated: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  accentMenzo: string;
  danger: string;
  success: string;
  warning: string;
};

export const MenzoTokens: MenzoTokens = {
  background: Colors.background,
  surface: Colors.surface,
  surfaceElevated: Colors.surfaceElevated,
  textPrimary: Colors.textPrimary,
  textSecondary: Colors.textSecondary,
  border: Colors.border,
  accentMenzo: Colors.orange,
  danger: Colors.danger,
  success: Colors.success,
  warning: Colors.yellow,
};
