import Image from "next/image";

export type MenziDjMode = "idle" | "playing" | "paused" | "error";

const MODE_IMAGE: Record<MenziDjMode, string> = {
  idle: "/illustrations/menzi/menzi-dj-idle.webp",
  playing: "/illustrations/menzi/menzi-dj-hero.webp",
  paused: "/illustrations/menzi/menzi-dj-idle.webp",
  error: "/illustrations/menzi/menzi-dj-idle.webp",
};

const MODE_LABEL: Record<MenziDjMode, string> = {
  idle: "Menzi DJ",
  playing: "Reproduciendo",
  paused: "En pausa",
  error: "Error de música",
};

/** Marca visual de Menzi DJ — nunca aparece como usuario/participante, solo como acompañamiento
 * de la función (ver sección 4 del pedido). El halo cian y las barras de ecualizador son la única
 * animación, y solo corren en modo "playing"; ambas respetan prefers-reduced-motion (ver
 * app/globals.css). No sustituye la miniatura real de la canción — se usa junto a ella, nunca en
 * su lugar. */
export function MenziDjBrand({ mode, compact = false, size }: { mode: MenziDjMode; compact?: boolean; size?: number }) {
  const avatarSize = size ?? (compact ? 28 : 40);
  const playing = mode === "playing";

  return (
    <div className="flex items-center gap-2">
      <div
        className={`relative shrink-0 overflow-hidden rounded-full ${playing ? "menzi-dj-breathe" : ""}`}
        style={{
          width: avatarSize,
          height: avatarSize,
          boxShadow: mode === "error" ? "0 0 0 2px var(--color-coral)" : playing ? "0 0 0 2px var(--color-cyan)" : "none",
        }}
      >
        <Image src={MODE_IMAGE[mode]} alt="" width={80} height={80} className="h-full w-full object-cover" />
      </div>
      {!compact && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-[var(--color-text-secondary)]">{MODE_LABEL[mode]}</span>
          {playing && (
            <span className="flex h-3 items-end gap-0.5" aria-hidden>
              <span className="menzi-dj-bar h-full w-0.5 rounded-full bg-[var(--color-cyan)]" style={{ animationDelay: "0ms" }} />
              <span className="menzi-dj-bar h-full w-0.5 rounded-full bg-[var(--color-cyan)]" style={{ animationDelay: "180ms" }} />
              <span className="menzi-dj-bar h-full w-0.5 rounded-full bg-[var(--color-cyan)]" style={{ animationDelay: "360ms" }} />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
