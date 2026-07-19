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
      className={`${fullWidth ? "w-full" : ""} rounded-full font-semibold text-[var(--color-text-on-accent)] transition-opacity ${
        size === "lg" ? "min-h-14 px-6" : "min-h-12 px-5"
      } ${isDisabled ? "opacity-45 cursor-not-allowed" : "hover:opacity-90 cursor-pointer"} flex items-center justify-center gap-2`}
      style={{ background: gradientCss(gradient) }}
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
