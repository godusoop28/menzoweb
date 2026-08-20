import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": import.meta.dirname,
    },
  },
  test: {
    // jsdom (no "node") porque lib/storage.ts hace feature-detection de `window` — sin un DOM
    // real, getItem/setItem/removeItem serían no-ops y los tests de chatAppearance no probarían
    // nada.
    environment: "jsdom",
  },
});
