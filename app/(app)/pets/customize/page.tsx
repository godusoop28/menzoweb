"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, petsApi } from "@/lib/api";
import type { PetCatalogDto, PetDto } from "@/lib/api/types";
import { GradientButton } from "@/components/GradientButton";
import { MenzoPet, MenzoPetItemThumb } from "@/components/pets/MenzoPet";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { ColorWheelPicker } from "@/components/ui/ColorWheelPicker";
import { petColorsToProps } from "@/lib/pets/petColors";

type PetTab = "colors" | "accessories";

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
  const [tab, setTab] = useState<PetTab>("colors");
  // itemId -> archivo SVG del ítem (manifest visual, no el catálogo de negocio) — para renderizar
  // una miniatura real de cada accesorio en vez de un botón de solo texto, mismo criterio que
  // pet_customize_screen.dart en menzomovil.
  const [itemFiles, setItemFiles] = useState<Record<string, string>>({});

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
    fetch("/pets/manifest.json")
      .then((r) => r.json())
      .then((manifest: { items: { id: string; file: string }[] }) => {
        setItemFiles(Object.fromEntries(manifest.items.map((i) => [i.id, i.file])));
      })
      .catch(() => setItemFiles({}));
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
  const petColors = petColorsToProps(previewColors);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 md:px-8">
      <h1 className="font-display text-xl font-bold">Personalizar a {pet.name}</h1>

      {/* Marco de "vitrina" con glow del color principal actual — antes la mascota flotaba
          directo sobre el fondo de la página, sin ningún peso visual propio (criterio
          "customizador de personaje" del pedido, no un formulario más). */}
      <div
        className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] py-6"
        style={{ boxShadow: `0 0 48px -12px ${petColors.primary}55` }}
      >
        <MenzoPet species={pet.speciesId} colors={petColors} equipment={previewEquipped} size={200} />
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

      <SegmentedTabs
        options={[
          { value: "colors", label: "Colores" },
          { value: "accessories", label: "Accesorios" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === "colors" ? (
        <div className="flex flex-col gap-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={resetSpeciesColors}
              className="cursor-pointer text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              Restablecer colores de especie
            </button>
          </div>
          {/* Grilla de swatches en vez de la lista de filas de antes — cada tile es tocable y
              abre el mismo ColorWheelPicker de siempre, solo cambia el layout alrededor. */}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {COLOR_FIELDS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setExpandedColor((prev) => (prev === key ? null : key))}
                className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border p-3 text-center transition-colors ${
                  expandedColor === key
                    ? "border-[var(--color-orange)]"
                    : "border-[var(--color-border-soft)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                <span
                  className="h-10 w-10 shrink-0 rounded-full border border-white/15"
                  style={{ background: draftColors[key] || "#888888" }}
                />
                <span className="text-xs font-medium leading-tight">{label}</span>
              </button>
            ))}
          </div>
          {expandedColor && (
            <div className="flex justify-center rounded-xl border border-[var(--color-border-soft)] p-4">
              <ColorWheelPicker
                value={draftColors[expandedColor] || "#888888"}
                onChange={(hex) => setColor(expandedColor, hex)}
                size={172}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {SLOT_ORDER.map((slot) => (
            <div key={slot} className="flex flex-col gap-2">
              <span className="text-sm text-[var(--color-text-muted)]">{SLOT_LABELS[slot]}</span>
              {/* Miniaturas reales del ítem (MenzoPetItemThumb) en vez de botones de solo texto —
                  un anillo naranja marca la selección, como un selector de personaje. */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setEquip(slot, null)}
                  className={`flex w-[76px] flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-colors cursor-pointer ${
                    !draftEquipped[slot]
                      ? "border-[var(--color-orange)] shadow-[0_0_12px_-2px_var(--color-orange)]"
                      : "border-[var(--color-border-soft)] hover:border-[var(--color-border-strong)]"
                  }`}
                >
                  <span className="flex h-[52px] w-[52px] items-center justify-center text-[var(--color-text-muted)]">
                    ⛔
                  </span>
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">Ninguno</span>
                </button>
                {itemsBySlot(slot).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setEquip(slot, item.id)}
                    className={`flex w-[76px] flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition-colors cursor-pointer ${
                      draftEquipped[slot] === item.id
                        ? "border-[var(--color-orange)] shadow-[0_0_12px_-2px_var(--color-orange)]"
                        : "border-[var(--color-border-soft)] hover:border-[var(--color-border-strong)]"
                    }`}
                  >
                    {itemFiles[item.id] ? (
                      <MenzoPetItemThumb file={itemFiles[item.id]} colors={petColors} size={52} />
                    ) : (
                      <span className="h-[52px] w-[52px]" />
                    )}
                    <span className="line-clamp-2 text-xs font-medium leading-tight">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
