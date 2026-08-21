/** Tabs con subrayado — mismo tratamiento que .tabs en el blueprint (web/styles.css): fila con
 * separación entre botones, línea inferior completa del contenedor, y una barra de 2px del color
 * de acento solo bajo el tab activo (no un fondo tipo píldora, que era el tratamiento anterior y
 * se parecía bastante menos a la referencia). Se usa en Inicio, Perfil, Chats y Personalización —
 * un solo cambio acá sube la fidelidad visual contra el blueprint en las cuatro pantallas. */
export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-6 overflow-x-auto border-b border-[var(--color-border-soft)]">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`relative shrink-0 cursor-pointer whitespace-nowrap px-0.5 py-3.5 text-sm font-medium transition-colors ${
              active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            {option.label}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--color-orange)]" />}
          </button>
        );
      })}
    </div>
  );
}
