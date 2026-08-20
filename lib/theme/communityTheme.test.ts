import { describe, expect, it } from "vitest";

import type { CommunityDetailDto, CommunitySummaryDto } from "@/lib/api/types";
import { MenzoTokens } from "@/lib/theme";

import { resolveCommunityTheme } from "./communityTheme";

function makeDetail(overrides: Partial<CommunityDetailDto> = {}): CommunityDetailDto {
  return {
    id: "c1",
    slug: "anime-chill",
    name: "Anime Chill",
    shortDescription: null,
    fullDescription: null,
    status: "ACTIVE",
    visibility: "PUBLIC",
    accessType: "OPEN",
    primaryLanguage: null,
    category: null,
    tags: [],
    iconUrl: null,
    logoUrl: null,
    coverUrl: null,
    backgroundUrl: null,
    bannerUrl: null,
    primaryColor: null,
    secondaryColor: null,
    accentColor: null,
    textColor: null,
    surfaceColor: null,
    memberCount: 0,
    onlineMemberCount: 0,
    postCount: 0,
    chatCount: 0,
    featured: false,
    official: false,
    allowJoinRequests: true,
    allowPublicChats: true,
    allowBlogs: true,
    allowVoiceRooms: true,
    allowMemberPosts: true,
    minimumGlobalLevelToJoin: 0,
    minimumGlobalLevelToPost: 0,
    themeConfig: {},
    navigationConfig: {},
    createdAt: new Date().toISOString(),
    myMembership: null,
    ...overrides,
  } as CommunityDetailDto;
}

describe("resolveCommunityTheme", () => {
  it("cae a los defaults de Menzo cuando no hay comunidad ni detalle (fallback seguro)", () => {
    const resolved = resolveCommunityTheme(null, null);
    expect(resolved.hasTheme).toBe(false);
    expect(resolved.nav.imageUrl).toBeUndefined();
    expect(resolved.feed.imageUrl).toBeUndefined();
    expect(resolved.overlayDecoration.imageUrl).toBeUndefined();
    expect(resolved.featuredVisual.imageUrl).toBeUndefined();
    expect(resolved.banner.imageUrl).toBeUndefined();
    expect(resolved.textColor).toBe(MenzoTokens.textPrimary);
    expect(resolved.surfaceColor).toBe(MenzoTokens.surface);
  });

  it("resuelve los 9 assets desde los campos directos del DTO + themeConfig", () => {
    const community: CommunitySummaryDto = { primaryColor: "#111111", secondaryColor: "#222222" } as CommunitySummaryDto;
    const detail = makeDetail({
      bannerUrl: "https://cdn/banner.png",
      textColor: "#EEEEEE",
      surfaceColor: "#333333",
      themeConfig: {
        navigationBackgroundUrl: "https://cdn/nav.png",
        feedBackgroundUrl: "https://cdn/feed.png",
        overlayDecorationUrl: "https://cdn/deco.png",
        featuredVisualUrl: "https://cdn/featured.png",
        headerStyle: "immersive",
        cardStyle: "soft",
        density: "comfortable",
      },
    });

    const resolved = resolveCommunityTheme(community, detail);

    expect(resolved.nav.imageUrl).toBe("https://cdn/nav.png");
    expect(resolved.navigationBackground.imageUrl).toBe("https://cdn/nav.png");
    expect(resolved.feed.imageUrl).toBe("https://cdn/feed.png");
    expect(resolved.overlayDecoration.imageUrl).toBe("https://cdn/deco.png");
    expect(resolved.featuredVisual.imageUrl).toBe("https://cdn/featured.png");
    expect(resolved.banner.imageUrl).toBe("https://cdn/banner.png");
    expect(resolved.textColor).toBe("#EEEEEE");
    expect(resolved.surfaceColor).toBe("#333333");
    expect(resolved.headerStyle).toBe("immersive");
    expect(resolved.cardStyle).toBe("soft");
    expect(resolved.density).toBe("comfortable");
  });

  it("navigationBackgroundUrl cae al alias legado navBackgroundUrl si no está configurado", () => {
    const detail = makeDetail({ themeConfig: { navBackgroundUrl: "https://cdn/legacy-nav.png" } });
    const resolved = resolveCommunityTheme(null, detail);
    expect(resolved.nav.imageUrl).toBe("https://cdn/legacy-nav.png");
    expect(resolved.navigationBackground.imageUrl).toBe("https://cdn/legacy-nav.png");
  });

  it("reduceCustomBackgrounds colapsa toda superficie con imagen a su fallback de color", () => {
    const community: CommunitySummaryDto = { primaryColor: "#111111", secondaryColor: "#222222" } as CommunitySummaryDto;
    const detail = makeDetail({
      bannerUrl: "https://cdn/banner.png",
      themeConfig: {
        navigationBackgroundUrl: "https://cdn/nav.png",
        feedBackgroundUrl: "https://cdn/feed.png",
        overlayDecorationUrl: "https://cdn/deco.png",
        featuredVisualUrl: "https://cdn/featured.png",
      },
    });

    const resolved = resolveCommunityTheme(community, detail, true);

    expect(resolved.nav.imageUrl).toBeUndefined();
    expect(resolved.feed.imageUrl).toBeUndefined();
    expect(resolved.overlayDecoration.imageUrl).toBeUndefined();
    expect(resolved.featuredVisual.imageUrl).toBeUndefined();
    expect(resolved.banner.imageUrl).toBeUndefined();
    // El gradiente de respaldo (primary/secondary) sigue disponible: solo se apaga la imagen.
    expect(resolved.nav.style?.backgroundImage).toContain("linear-gradient");
    // hasTheme se calcula sobre los datos crudos de la comunidad, no sobre la preferencia de
    // accesibilidad — "tiene tema" es una propiedad de la comunidad, no del viewer.
    expect(resolved.hasTheme).toBe(true);
  });
});
