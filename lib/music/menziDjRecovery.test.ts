import { describe, expect, it } from "vitest";

import { isFatalYoutubeError } from "./menziDjRecovery";

describe("isFatalYoutubeError (auditoría de confiabilidad — sección 21, clasificación de errores)", () => {
  it("100/101/150 son fatales — el video no se va a poder reproducir reintentando", () => {
    expect(isFatalYoutubeError(100)).toBe(true);
    expect(isFatalYoutubeError(101)).toBe(true);
    expect(isFatalYoutubeError(150)).toBe(true);
  });

  it("2/5 son transitorios — no ameritan saltar la canción automáticamente", () => {
    expect(isFatalYoutubeError(2)).toBe(false);
    expect(isFatalYoutubeError(5)).toBe(false);
  });

  it("un código desconocido se trata como transitorio, nunca fatal por default", () => {
    expect(isFatalYoutubeError(999)).toBe(false);
  });
});
