"use client";

import { gradientCss, Gradients, type GradientId } from "@/lib/theme";

type Props = {
  label: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  gradient?: GradientId;
  size?: "md" | "lg";
  fullWidth?: boolean;
};

const GLOW_COLOR: Record<GradientId, string> = {
  fire: "rgba(255,122,26,0.35)",
  connection: "rgba(52,120,246,0.35)",
  midnight: "rgba(139,92,246,0.35)",
  creative: "rgba(255,79,69,0.35)",
  community: "rgba(104,211,145,0.35)",
};

export function GradientButton({
  label,
  onClick,
  type = "button",
  disabled,
  loading,
  gradient = "fire",
  size = "lg",
  fullWidth = true,
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`${fullWidth ? "w-full" : ""} rounded-full font-semibold text-[var(--color-text-on-accent)] transition-all duration-150 ${
        size === "lg" ? "min-h-14 px-6" : "min-h-12 px-5"
      } ${
        isDisabled
          ? "opacity-45 cursor-not-allowed"
          : "cursor-pointer hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0"
      } flex items-center justify-center gap-2`}
      style={{
        background: gradientCss(gradient),
        boxShadow: isDisabled ? undefined : `0 8px 24px -6px ${GLOW_COLOR[gradient]}`,
      }}
    >
      {loading ? (
        <span
          className="h-5 w-5 rounded-full border-2 border-current border-t-transparent animate-spin"
          aria-hidden
        />
      ) : (
        label
      )}
    </button>
  );
}

export { Gradients };
