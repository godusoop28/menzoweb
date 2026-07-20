type Props = {
  src: string;
  overlay?: number;
  children: React.ReactNode;
};

/** Fondo de imagen con velo oscuro + degradado en los bordes, igual que MenzoImageBackground en la móvil. */
export function ScreenBackground({ src, overlay = 0.72, children }: Props) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0" style={{ background: `rgba(7,9,13,${overlay})` }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to bottom, rgba(7,9,13,0.15) 0%, rgba(7,9,13,0.35) 55%, rgba(7,9,13,0.9) 100%)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
