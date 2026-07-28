type Props = {
  src?: string;
  color?: string;
  overlay?: number;
  children: React.ReactNode;
};

/** Fondo de imagen (o color plano) con velo oscuro + degradado en los bordes, igual que
 * MenzoImageBackground en la móvil. Pasa `src` para una foto o `color` para un fondo liso. */
export function ScreenBackground({ src, color, overlay = 0.72, children }: Props) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: color }} />
      )}
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
