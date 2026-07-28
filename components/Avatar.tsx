import { gradientCss, levelTier, type GradientId } from "@/lib/theme";

type Props = {
  name: string;
  avatarUri?: string;
  gradient?: GradientId;
  size?: number;
  online?: boolean;
  showOnline?: boolean;
  level?: number;
};

export function Avatar({ name, avatarUri, gradient = "fire", size = 48, online, showOnline, level }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const tier = level !== undefined ? levelTier(level) : null;
  const ringWidth = tier ? Math.max(2, Math.round(size * 0.07)) : 0;
  const photoSize = size - ringWidth * 2;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {tier && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: tier.gradient ? gradientCss(tier.gradient) : tier.color,
            boxShadow: tier.glow ? `0 0 6px 0 ${tier.color}` : undefined,
          }}
        />
      )}
      <div
        className="absolute overflow-hidden flex items-center justify-center bg-[var(--color-surface-elevated)]"
        style={{ width: photoSize, height: photoSize, top: ringWidth, left: ringWidth, borderRadius: "50%" }}
      >
        {avatarUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUri} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full flex items-center justify-center text-white font-bold"
            style={{ background: gradientCss(gradient), fontSize: photoSize * 0.4 }}
          >
            {initial}
          </div>
        )}
      </div>
      {showOnline && (
        <span
          className="absolute -bottom-0.5 -right-0.5 rounded-full border-2"
          style={{
            width: size * 0.32,
            height: size * 0.32,
            borderColor: "var(--color-background)",
            background: online ? "var(--color-online)" : "var(--color-offline)",
          }}
        />
      )}
    </div>
  );
}
