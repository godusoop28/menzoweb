export const NAME_MIN = 2;
export const NAME_MAX = 20;

export function collapseSpaces(value: string) {
  return value.replace(/\s+/g, " ");
}

export function isValidDisplayName(value: string) {
  const trimmed = collapseSpaces(value).trim();
  return trimmed.length >= NAME_MIN && trimmed.length <= NAME_MAX;
}

// Mismos límites que OnboardingRequest.username en menzoapi (@Size(min = 3, max = 20)) — la
// unicidad y el chequeo anti-spoofing son responsabilidad exclusiva del servidor (ver
// useUsernameAvailability), esto es solo la forma básica del texto.
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
const USERNAME_PATTERN = /^[a-z0-9_.]+$/;

export function isValidUsernameShape(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.length >= USERNAME_MIN && trimmed.length <= USERNAME_MAX && USERNAME_PATTERN.test(trimmed);
}
