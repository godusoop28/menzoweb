// Espejo de SocialPlatform.java (menzoapi) — mismo orden, mismos nombres exactos.
export type SocialPlatformId =
  | "XBOX"
  | "PLAYSTATION"
  | "NINTENDO"
  | "STEAM"
  | "ROBLOX"
  | "DISCORD"
  | "INSTAGRAM"
  | "TIKTOK"
  | "TWITTER"
  | "TWITCH"
  | "YOUTUBE";

export const SOCIAL_PLATFORMS: { id: SocialPlatformId; label: string; placeholder: string }[] = [
  { id: "XBOX", label: "Xbox", placeholder: "Gamertag" },
  { id: "PLAYSTATION", label: "PlayStation", placeholder: "ID de PSN" },
  { id: "NINTENDO", label: "Nintendo", placeholder: "Nintendo Switch" },
  { id: "STEAM", label: "Steam", placeholder: "Usuario de Steam" },
  { id: "ROBLOX", label: "Roblox", placeholder: "Usuario de Roblox" },
  { id: "DISCORD", label: "Discord", placeholder: "usuario#0000" },
  { id: "INSTAGRAM", label: "Instagram", placeholder: "@usuario" },
  { id: "TIKTOK", label: "TikTok", placeholder: "@usuario" },
  { id: "TWITTER", label: "X / Twitter", placeholder: "@usuario" },
  { id: "TWITCH", label: "Twitch", placeholder: "Usuario de Twitch" },
  { id: "YOUTUBE", label: "YouTube", placeholder: "@canal" },
];
