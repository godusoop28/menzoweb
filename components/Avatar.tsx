import { gradientCss, type GradientId } from "@/lib/theme";

type Props = {
  name: string;
  avatarUri?: string;
  gradient?: GradientId;
  size?: number;
  online?: boolean;
  showOnline?: boolean;
};

export function Avatar({ name, avatarUri, gradient = "fire", size = 48, online, showOnline }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="overflow-hidden flex items-center justify-center bg-[var(--color-surface-elevated)]"
        style={{ width: size, height: size, borderRadius: "50%" }}
      >
        {avatarUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUri} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div
            className="h-full w-full flex items-center justify-center text-white font-bold"
            style={{ background: gradientCss(gradient), fontSize: size * 0.4 }}
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
