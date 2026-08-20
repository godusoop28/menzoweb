import { beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_CHAT_APPEARANCE, getChatAppearance, resetChatAppearance, setChatAppearance } from "./chatAppearance";

describe("chatAppearance (apariencia de chat personal, local por usuario+sala)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("devuelve los defaults cuando el usuario nunca personalizó esa sala", () => {
    expect(getChatAppearance("user-1", "room-1")).toEqual(DEFAULT_CHAT_APPEARANCE);
  });

  it("guarda por usuario+sala sin que una sala pise a la otra para el mismo usuario", () => {
    setChatAppearance("user-1", "room-1", { wallpaperUrl: "https://cdn/a.png" });
    setChatAppearance("user-1", "room-2", { wallpaperUrl: "https://cdn/b.png" });

    expect(getChatAppearance("user-1", "room-1").wallpaperUrl).toBe("https://cdn/a.png");
    expect(getChatAppearance("user-1", "room-2").wallpaperUrl).toBe("https://cdn/b.png");
  });

  it("no filtra preferencias entre usuarios distintos en el mismo dispositivo/sala", () => {
    setChatAppearance("user-1", "room-1", { compactMode: true });
    expect(getChatAppearance("user-2", "room-1").compactMode).toBe(false);
  });

  it("un patch parcial conserva el resto de los valores ya guardados", () => {
    setChatAppearance("user-1", "room-1", { textScale: 1.2 });
    setChatAppearance("user-1", "room-1", { compactMode: true });

    const prefs = getChatAppearance("user-1", "room-1");
    expect(prefs.textScale).toBe(1.2);
    expect(prefs.compactMode).toBe(true);
  });

  it("restablecer borra la clave (no reescribe los defaults)", () => {
    setChatAppearance("user-1", "room-1", { showAvatars: false });
    resetChatAppearance("user-1", "room-1");

    expect(window.localStorage.getItem("menzo.chatAppearance.user-1.room-1")).toBeNull();
    expect(getChatAppearance("user-1", "room-1")).toEqual(DEFAULT_CHAT_APPEARANCE);
  });
});
