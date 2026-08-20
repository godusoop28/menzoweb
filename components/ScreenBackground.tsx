type Props = {
  src?: string;
  color?: string;
  overlay?: number;
  children: React.ReactNode;
};

/** Fondo de imagen (o color plano) con velo oscuro + degradado en los bordes, igual que
 * MenzoImageBackground en la móvil. Pasa `src` para una foto o `color` para un fondo liso.
 *
 * Solo se muestra hasta `md` (`md:hidden` en la capa de imagen): estos fondos personales se suben
 * pensando en una pantalla de celular (retrato, la foto ocupa todo el alto). `object-cover` sobre
 * un viewport de escritorio mucho más ancho que alto fuerza un zoom enorme sobre una porción
 * angosta de la imagen — con fotos que llevan texto (portadas con frases, capturas, etc.) el
 * resultado son letras gigantes irreconocibles cubriendo media pantalla. Ninguna referencia de
 * escritorio muestra este fondo personal a pantalla completa; ahí el layout ya tiene su propia
 * portada acotada (h-40/h-44) adentro de la tarjeta de perfil, que no tiene este problema porque
 * su altura es fija y chica. */
export function ScreenBackground({ src, color, overlay = 0.72, children }: Props) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div className="absolute inset-0 md:hidden">
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
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
