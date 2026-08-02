"use client";

/** Orbe central de DJ Menzi para la pantalla del LIVE — centerpiece puramente decorativo, nunca
 * el reproductor real (ese sigue siendo el único `<div>`/iframe persistente en
 * MenziDjPlayerHost.tsx, sin tocar). Reusa la animación `.menzi-dj-breathe` que ya existía para
 * el halo chico de MenziDjBrand (respeta prefers-reduced-motion, ver app/globals.css) en vez de
 * definir una nueva — mismo lenguaje visual en toda la app. `voiceLevel` (0-1, el máximo de
 * `live.speakingLevels` en ese instante) le agrega un empujón de escala extra mientras alguien
 * está hablando, así también reacciona a las voces del LIVE, no solo a la música. */
export function DjMenziOrb({
  playing,
  voiceLevel,
  title,
  onClick,
}: {
  playing: boolean;
  voiceLevel: number;
  title?: string | null;
  onClick: () => void;
}) {
  const boost = Math.min(1, Math.max(0, voiceLevel)) * 0.16;

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 cursor-pointer" aria-label="Abrir DJ Menzi">
      <div
        className={`relative flex h-16 w-16 items-center justify-center rounded-full ${playing ? "menzi-dj-breathe" : ""}`}
        style={{
          background: "linear-gradient(135deg, var(--color-cyan), var(--color-orange))",
          transform: boost ? `scale(${1 + boost})` : undefined,
          transition: "transform 150ms ease-out",
          boxShadow: `0 0 ${18 + boost * 30}px ${3 + boost * 6}px color-mix(in srgb, var(--color-cyan) ${playing ? 35 : 20}%, transparent)`,
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 14v-3a8 8 0 0 1 16 0v3M4 14a2 2 0 0 0 2 2h1v-5H5a1 1 0 0 0-1 1v2Zm16 0a2 2 0 0 1-2 2h-1v-5h2a1 1 0 0 1 1 1v2Z"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {title && <p className="max-w-[100px] truncate text-center text-[11px] font-medium text-[var(--color-text-secondary)]">{title}</p>}
    </button>
  );
}
