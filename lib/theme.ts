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

export const Radius = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  pill: 999,
} as const;
