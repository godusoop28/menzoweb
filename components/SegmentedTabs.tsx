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
    <div
      role="tablist"
      className="flex gap-1 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] p-1"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={`flex-1 cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active ? "bg-[var(--color-surface-soft)] text-[var(--color-orange)]" : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
