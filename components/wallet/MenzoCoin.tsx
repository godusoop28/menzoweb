import { useId } from "react";

/** Moneda MC — dorada con una "M" grabada. Puro SVG para que se vea nítida a cualquier tamaño y
 * no dependa de ningún asset. */
export function MenzoCoin({ size = 18, className = "" }: { size?: number; className?: string }) {
  const gradientId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`shrink-0 ${className}`} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.55" stopColor="#ffbe2e" />
          <stop offset="1" stopColor="#ff8a1a" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="#c96a10" />
      <circle cx="12" cy="11.3" r="10.2" fill={`url(#${gradientId})`} />
      <circle cx="12" cy="11.3" r="7.6" fill="none" stroke="#fff3c4" strokeOpacity="0.55" strokeWidth="1" />
      <path
        d="M7.6 15.2V7.6l4.4 4.6 4.4-4.6v7.6"
        fill="none"
        stroke="#8a3f00"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
