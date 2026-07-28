import { gradientCss, type GradientId } from "@/lib/theme";
import type { AbstractVisualPreset } from "@/lib/types";

const presetGradient: Record<AbstractVisualPreset, GradientId> = {
  fire: "fire",
  storm: "connection",
  eclipse: "midnight",
  rebirth: "community",
  prism: "creative",
  midnight: "midnight",
  memory: "community",
  community: "community",
};

function hashSeed(value: string) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Shape = { top: string; left: string; size: number; rotate: string; opacity: number; circle: boolean };

function buildShapes(preset: string, count: number): Shape[] {
  const rand = mulberry32(hashSeed(preset));
  return Array.from({ length: count }, (_, i) => ({
    top: `${Math.round(rand() * 80)}%`,
    left: `${Math.round(rand() * 80)}%`,
    size: 26 + Math.round(rand() * 90),
    rotate: `${Math.round(rand() * 60 - 30)}deg`,
    opacity: 0.08 + rand() * 0.14,
    circle: i % 2 === 0,
  }));
}

type Props = {
  preset: AbstractVisualPreset;
  className?: string;
  caption?: string;
  dim?: boolean;
};

export function AbstractArtwork({ preset, className, caption, dim }: Props) {
  const gradientId = presetGradient[preset];
  const shapes = buildShapes(preset, 6);

  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={{ background: gradientCss(gradientId) }}>
      {dim && <div className="absolute inset-0" style={{ background: "rgba(3,5,9,0.35)" }} />}
      {shapes.map((shape, index) => (
        <div
          key={index}
          className="absolute"
          style={{
            top: shape.top,
            left: shape.left,
            width: shape.size,
            height: shape.size,
            borderRadius: shape.circle ? "50%" : 6,
            transform: `rotate(${shape.rotate})`,
            backgroundColor: `rgba(255,255,255,${shape.opacity})`,
          }}
        />
      ))}
      {caption && (
        <div className="absolute bottom-3 left-3.5">
          <p className="truncate text-xs font-semibold text-white/85">{caption}</p>
        </div>
      )}
    </div>
  );
}
