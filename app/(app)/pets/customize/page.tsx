"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, petsApi } from "@/lib/api";
import type { PetCatalogDto, PetDto } from "@/lib/api/types";
import { GradientButton } from "@/components/GradientButton";
import { MenzoPet } from "@/components/pets/MenzoPet";
import { ColorWheelPicker } from "@/components/ui/ColorWheelPicker";
import { petColorsToProps } from "@/lib/pets/petColors";

const COLOR_FIELDS: { key: string; label: string }[] = [
  { key: "primary", label: "Color principal" },
  { key: "secondary", label: "Color secundario" },
  { key: "markings", label: "Marcas" },
  { key: "eyes", label: "Ojos" },
  { key: "hair", label: "Pelo" },
  { key: "accessoryPrimary", label: "Accesorios (principal)" },
  { key: "accessorySecondary", label: "Accesorios (secundario)" },
  { key: "accessoryAccent", label: "Accesorios (acento)" },
  { key: "effect", label: "Efecto/aura" },
];

const SLOT_LABELS: Record<string, string> = {
  hair: "Pelo",
  body: "Cuerpo",
  neck: "Cuello",
  head: "Cabeza",
  face: "Cara",
  audio: "Audio",
  effect: "Efecto",
};
const SLOT_ORDER = ["hair", "body", "neck", "head", "face", "audio", "effect"];

function sameRecord(a: Record<string, string>, b: Record<string, string>) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if ((a[key] ?? null) !== (b[key] ?? null)) return false;
  }
  return true;
}

export default function CustomizePetPage() {
  const router = useRouter();
  const [pet, setPet] = useState<PetDto | null | undefined>(undefined);
  const [catalog, setCatalog] = useState<PetCatalogDto | null>(null);

  // draftColors/draftEquipped son el estado en edición (solo local, sin persistir).
  // pet.colors/pet.equipped son la última apariencia guardada — nunca se tocan hasta Guardar.
  const [draftColors, setDraftColors] = useState<Record<string, string>>({});
  const [draftEquipped, setDraftEquipped] = useState<Record<string, string>>({});
  const [comparing, setComparing] = useState(false);

  const [name, setName] = useState("");
  const [expandedColor, setExpandedColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    petsApi
      .mine()
      .then((p) => {
        setPet(p);
        setDraftColors(p.colors);
        setDraftEquipped(p.equipped);
        setName(p.name);
      })
      .catch(() => setPet(null));
    petsApi.catalog().then(setCatalog);
  }, []);

  const hasChanges =
    !!pet && (!sameRecord(draftColors, pet.colors) || !sameRecord(draftEquipped, pet.equipped));

  function setColor(key: string, value: string) {
    setDraftColors((prev) => ({ ...prev, [key]: value }));
  }

  function setEquip(slot: string, itemId: string | null) {
    setDraftEquipped((prev) => {
      const next = { ...prev };
      if (itemId) next[slot] = itemId;
      else delete next[slot];
      return next;
    });
  }

  function resetToSaved() {
    if (!pet) return;
    setDraftColors(pet.colors);
    setDraftEquipped(pet.equipped);
  }

  function resetSpeciesColors() {
    const species = catalog?.species.find((s) => s.id === pet?.speciesId);
    if (!species) return;
    setDraftColors(species.defaultColors);
  }

  function cancel() {
    resetToSaved();
    router.push("/pets");
  }

  async function save() {
    if (!pet || !hasChanges) return;
    setSaving(true);
    setError(null);
    try {
      let updated = pet;

      const colorDiff: Record<string, string> = {};
      for (const { key } of COLOR_FIELDS) {
        if ((draftColors[key] ?? null) !== (pet.colors[key] ?? null)) {
          colorDiff[key] = draftColors[key];
        }
      }
      if (Object.keys(colorDiff).length > 0) {
        updated = await petsApi.updateColors({ colors: colorDiff });
      }

      const slots = new Set([...Object.keys(pet.equipped), ...Object.keys(draftEquipped)]);
      for (const slot of slots) {
        const savedVal = pet.equipped[slot] ?? null;
        const draftVal = draftEquipped[slot] ?? null;
        if (savedVal !== draftVal) {
          updated = await petsApi.equip({ slot, itemId: draftVal });
        }
      }

      setPet(updated);
      setDraftColors(updated.colors);
      setDraftEquipped(updated.equipped);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  async function saveName() {
    if (!pet || name.trim().length < 2 || name.trim() === pet.name) return;
    setSavingName(true);
    setError(null);
    try {
      const updated = await petsApi.rename({ name: name.trim() });
      setPet(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cambiar el nombre.");
    } finally {
      setSavingName(false);
    }
  }

  if (pet === undefined) return <div className="px-4 py-6 md:px-8">Cargando...</div>;
  if (pet === null) {
    router.replace("/pets");
    return null;
  }

  const itemsBySlot = (slot: string) => (catalog?.items ?? []).filter((i) => i.slot === slot);
  const previewColors = comparing ? pet.colors : draftColors;
  const previewEquipped = comparing ? pet.equipped : draftEquipped;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 md:px-8">
      <h1 className="font-display text-xl font-bold">Personalizar a {pet.name}</h1>

      <div className="flex flex-col items-center gap-2">
        <MenzoPet species={pet.speciesId} colors={petColorsToProps(previewColors)} equipment={previewEquipped} size={200} />
        {hasChanges && (
          <button
            type="button"
            onMouseDown={() => setComparing(true)}
            onMouseUp={() => setComparing(false)}
            onMouseLeave={() => setComparing(false)}
            onTouchStart={() => setComparing(true)}
            onTouchEnd={() => setComparing(false)}
            className="cursor-pointer select-none rounded-full border border-[var(--color-border-soft)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
          >
            Mantené pulsado para ver el original
          </button>
        )}
      </div>

      {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

      <div className="flex flex-col gap-2">
        <span className="text-sm text-[var(--color-text-muted)]">Nombre</span>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 24))}
            className="flex-1 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-2.5 outline-none transition-colors focus:border-[var(--color-orange)]"
          />
          <button
            onClick={saveName}
            disabled={savingName || name.trim().length < 2 || name.trim() === pet.name}
            className="rounded-xl border border-[var(--color-border-soft)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40 enabled:cursor-pointer enabled:hover:border-[var(--color-orange)]"
          >
            Guardar
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Colores</h2>
          <button
            type="button"
            onClick={resetSpeciesColors}
            className="cursor-pointer text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            Restablecer colores de especie
          </button>
        </div>
        {COLOR_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-soft)] p-3">
            <button
              type="button"
              onClick={() => setExpandedColor((prev) => (prev === key ? null : key))}
              className="flex w-full cursor-pointer items-center gap-3"
            >
              <span
                className="h-8 w-8 shrink-0 rounded-lg border border-[var(--color-border-soft)]"
                style={{ background: draftColors[key] || "#888888" }}
              />
              <p className="flex-1 text-left text-sm font-medium">{label}</p>
              <span className="text-xs text-[var(--color-text-muted)]">{draftColors[key] || "—"}</span>
            </button>
            {expandedColor === key && (
              <ColorWheelPicker value={draftColors[key] || "#888888"} onChange={(hex) => setColor(key, hex)} size={148} />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Accesorios</h2>
        {SLOT_ORDER.map((slot) => (
          <div key={slot} className="flex flex-col gap-2">
            <span className="text-sm text-[var(--color-text-muted)]">{SLOT_LABELS[slot]}</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setEquip(slot, null)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  !draftEquipped[slot]
                    ? "border-[var(--color-orange)] text-[var(--color-orange)]"
                    : "border-[var(--color-border-soft)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                Ninguno
              </button>
              {itemsBySlot(slot).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setEquip(slot, item.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                    draftEquipped[slot] === item.id
                      ? "border-[var(--color-orange)] text-[var(--color-orange)]"
                      : "border-[var(--color-border-soft)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={resetToSaved}
          disabled={!hasChanges}
          className="flex-1 rounded-xl border border-[var(--color-border-soft)] px-4 py-3 text-sm font-semibold disabled:opacity-40 enabled:cursor-pointer enabled:hover:border-[var(--color-border-strong)]"
        >
          Restablecer
        </button>
        <button
          type="button"
          onClick={cancel}
          className="flex-1 cursor-pointer rounded-xl border border-[var(--color-border-soft)] px-4 py-3 text-sm font-semibold hover:border-[var(--color-border-strong)]"
        >
          Cancelar
        </button>
      </div>
      <GradientButton label={saving ? "Guardando..." : "Guardar"} onClick={save} disabled={saving || !hasChanges} />
    </div>
  );
}
