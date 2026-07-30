import Image from "next/image";

export type MenziIllustrationSize = "small" | "medium" | "large";

const SIZE_WIDTH: Record<MenziIllustrationSize, string> = {
  small: "clamp(64px, 16vw, 96px)",
  medium: "clamp(110px, 22vw, 200px)",
  large: "clamp(140px, 28vw, 280px)",
};

type Action = { label: string; onClick: () => void };

type Props = {
  /** Ruta dentro de /public, p. ej. "/illustrations/menzi/menzi-chat.webp". */
  image: string;
  /** Alt descriptivo y breve. Pasa "" si la imagen es puramente decorativa (ver sección 17). */
  alt: string;
  title?: string;
  description?: string;
  action?: Action;
  secondaryAction?: Action;
  size?: MenziIllustrationSize;
  className?: string;
  /** Solo true cuando la ilustración es realmente visible sin scroll al cargar la página. */
  priority?: boolean;
  /** Layout horizontal y compacto (ilustración + texto en fila) en vez de vertical centrado —
   * para acompañar un encabezado en vez de ocupar un estado vacío completo. */
  compact?: boolean;
};

/** Ilustración de marca reutilizable para estados vacíos, encabezados de función y ayudas
 * contextuales — nunca sustituye íconos funcionales (mic, notificaciones, configuración, etc.),
 * ver sección 5 del pedido. Un único componente cubre las 6 categorías de mascota (chat, live,
 * notificaciones, configuración, amigos, Menzi DJ); cada página solo pasa la imagen que le
 * corresponde. */
export function MenziIllustrationState({
  image,
  alt,
  title,
  description,
  action,
  secondaryAction,
  size = "medium",
  className,
  priority,
  compact,
}: Props) {
  const width = SIZE_WIDTH[size];

  const picture = (
    <Image
      src={image}
      alt={alt}
      width={640}
      height={640}
      priority={priority}
      loading={priority ? undefined : "lazy"}
      style={{ width, height: "auto" }}
      className="shrink-0 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
    />
  );

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className ?? ""}`}>
        {picture}
        {(title || description) && (
          <div className="min-w-0">
            {title && <p className="font-display text-base font-bold text-[var(--color-text-primary)]">{title}</p>}
            {description && <p className="text-sm text-[var(--color-text-muted)]">{description}</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-3 py-6 text-center ${className ?? ""}`}>
      {picture}
      {title && <p className="font-display text-base font-bold text-[var(--color-text-primary)]">{title}</p>}
      {description && <p className="max-w-xs text-sm text-[var(--color-text-muted)]">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-1 flex items-center gap-2">
          {action && (
            <button
              onClick={action.onClick}
              className="rounded-full bg-[var(--color-cyan)] px-4 py-2 text-sm font-semibold text-black cursor-pointer"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="rounded-full bg-[var(--color-surface-secondary)] px-4 py-2 text-sm font-semibold text-[var(--color-text-primary)] cursor-pointer"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
