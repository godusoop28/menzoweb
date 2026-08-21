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

export default function CustomizePetPage() {
  const router = useRouter();
  const [pet, setPet] = useState<PetDto | null | undefined>(undefined);
  const [catalog, setCatalog] = useState<PetCatalogDto | null>(null);
  const [colors, setColors] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [expandedColor, setExpandedColor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    petsApi
      .mine()
      .then((p) => {
        setPet(p);
        setColors(p.colors);
        setName(p.name);
      })
      .catch(() => setPet(null));
    petsApi.catalog().then(setCatalog);
  }, []);

  async function saveColor(key: string, value: string) {
    const next = { ...colors, [key]: value };
    setColors(next);
    try {
      const updated = await petsApi.updateColors({ colors: { [key]: value } });
      setPet(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos guardar el color.");
    }
  }

  async function equip(slot: string, itemId: string | null) {
    try {
      const updated = await petsApi.equip({ slot, itemId });
      setPet(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos equipar ese ítem.");
    }
  }

  async function saveName() {
    if (!pet || name.trim().length < 2 || name.trim() === pet.name) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await petsApi.rename({ name: name.trim() });
      setPet(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos cambiar el nombre.");
    } finally {
      setSaving(false);
    }
  }

  if (pet === undefined) return <div className="px-4 py-6 md:px-8">Cargando...</div>;
  if (pet === null) {
    router.replace("/pets");
    return null;
  }

  const itemsBySlot = (slot: string) => (catalog?.items ?? []).filter((i) => i.slot === slot);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 md:px-8">
      <h1 className="font-display text-xl font-bold">Personalizar a {pet.name}</h1>

      <div className="flex justify-center">
        <MenzoPet species={pet.speciesId} colors={petColorsToProps(colors)} equipment={pet.equipped} size={200} />
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
            disabled={saving || name.trim().length < 2 || name.trim() === pet.name}
            className="rounded-xl border border-[var(--color-border-soft)] px-4 py-2.5 text-sm font-semibold disabled:opacity-40 enabled:cursor-pointer enabled:hover:border-[var(--color-orange)]"
          >
            Guardar
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Colores</h2>
        {COLOR_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-soft)] p-3">
            <button
              type="button"
              onClick={() => setExpandedColor((prev) => (prev === key ? null : key))}
              className="flex w-full cursor-pointer items-center gap-3"
            >
              <span
                className="h-8 w-8 shrink-0 rounded-lg border border-[var(--color-border-soft)]"
                style={{ background: colors[key] || "#888888" }}
              />
              <p className="flex-1 text-left text-sm font-medium">{label}</p>
              <span className="text-xs text-[var(--color-text-muted)]">{colors[key] || "—"}</span>
            </button>
            {expandedColor === key && (
              <ColorWheelPicker value={colors[key] || "#888888"} onChange={(hex) => saveColor(key, hex)} size={148} />
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
                onClick={() => equip(slot, null)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  !pet.equipped[slot]
                    ? "border-[var(--color-orange)] text-[var(--color-orange)]"
                    : "border-[var(--color-border-soft)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)]"
                }`}
              >
                Ninguno
              </button>
              {itemsBySlot(slot).map((item) => (
                <button
                  key={item.id}
                  onClick={() => equip(slot, item.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                    pet.equipped[slot] === item.id
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

      <GradientButton label="Listo" onClick={() => router.push("/pets")} />
    </div>
  );
}
