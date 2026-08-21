import type { SocialPlatformId } from "@/lib/social";

/** Iconos monocromo simples (no son los logos oficiales pixel-perfect, solo glifos
 * distinguibles por plataforma) para acompañar cada link social en el perfil. */
export function SocialPlatformIcon({ id, className }: { id: SocialPlatformId; className?: string }) {
  const props = { className: className ?? "h-3.5 w-3.5", viewBox: "0 0 20 20", fill: "none" as const };

  switch (id) {
    case "XBOX":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <circle cx="10" cy="10" r="8" />
          <path d="M4.5 4.8c1.6 2 3.4 3.4 5.5 3.4s3.9-1.4 5.5-3.4M6.2 16c1.4-2.6 2.4-4.6 3.8-6M13.8 16c-1.4-2.6-2.4-4.6-3.8-6" />
        </svg>
      );
    case "PLAYSTATION":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="6" width="15" height="9" rx="4" />
          <circle cx="7" cy="10.5" r="0.6" fill="currentColor" stroke="none" />
          <path d="M7 9v3M5.5 10.5h3" />
          <circle cx="14.5" cy="9.3" r="0.9" />
          <circle cx="12.7" cy="11.1" r="0.9" />
        </svg>
      );
    case "NINTENDO":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2.5" y="4" width="6" height="12" rx="3" />
          <rect x="11.5" y="4" width="6" height="12" rx="3" />
          <circle cx="14.5" cy="8" r="0.6" fill="currentColor" stroke="none" />
          <circle cx="14.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
          <path d="M5.5 7.5v3M4 9h3" />
        </svg>
      );
    case "STEAM":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="8" />
          <circle cx="7.2" cy="12.5" r="1.6" />
          <circle cx="12.6" cy="7.4" r="2.1" />
          <path d="M8.6 11.8l2.6-2.6" />
        </svg>
      );
    case "ROBLOX":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" transform="rotate(-14 8 8)" />
          <rect x="8.5" y="8.5" width="8" height="8" rx="1.3" transform="rotate(-14 12.5 12.5)" />
        </svg>
      );
    case "DISCORD":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 14.5c0-4 1-8 1-8s2-1 3-1l.6 1.1a10 10 0 0 1 2.8 0L12 5.5c1 0 3 1 3 1s1 4 1 8c-1.6 1.1-3.1 1.7-4.5 1.9l-.6-1.2c.7-.2 1.3-.5 1.9-.9-1.6.8-3.5.8-5.6 0 .6.4 1.2.7 1.9.9l-.6 1.2C6.6 16.2 5.1 15.6 4 14.5Z" />
          <circle cx="8" cy="11" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="12" cy="11" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case "INSTAGRAM":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="14" height="14" rx="4" />
          <circle cx="10" cy="10" r="3.4" />
          <circle cx="14" cy="6" r="0.7" fill="currentColor" stroke="none" />
        </svg>
      );
    case "TIKTOK":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 3.5v9.3a2.7 2.7 0 1 1-2.2-2.66" />
          <path d="M11 3.5c.4 2 2 3.4 4 3.6" />
        </svg>
      );
    case "TWITTER":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
          <path d="M4.5 4.5l11 11M15.5 4.5l-11 11" />
        </svg>
      );
    case "TWITCH":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M4 3.5h12v8l-3 3h-3l-2 2v-2H4z" />
          <path d="M9.5 6.5v3.2M13 6.5v3.2" strokeLinecap="round" />
        </svg>
      );
    case "YOUTUBE":
      return (
        <svg {...props} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
          <rect x="2.5" y="5" width="15" height="10" rx="3.5" />
          <path d="M8.5 8v4l3.5-2z" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return null;
  }
}
