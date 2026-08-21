"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { ApiError, petsApi } from "@/lib/api";
import type { PetCatalogDto, PetDto, PetXpSource } from "@/lib/api/types";
import { GradientButton } from "@/components/GradientButton";
import { LevelBadge } from "@/components/LevelBadge";
import { MenzoPet } from "@/components/pets/MenzoPet";
import { petColorsToProps } from "@/lib/pets/petColors";

const INTERACTIONS: { source: PetXpSource; label: string; verb: string }[] = [
  { source: "FEED", label: "Alimentar", verb: "alimentaste a" },
  { source: "PLAY", label: "Jugar", verb: "jugaste con" },
  { source: "PET_INTERACTION", label: "Acariciar", verb: "acariciaste a" },
];

export default function PetsPage() {
  const [pet, setPet] = useState<PetDto | null | undefined>(undefined);
  const [catalog, setCatalog] = useState<PetCatalogDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busySource, setBusySource] = useState<PetXpSource | null>(null);

  useEffect(() => {
    petsApi
      .mine()
      .then(setPet)
      .catch((e) => setPet(e instanceof ApiError && e.status === 404 ? null : undefined));
    petsApi.catalog().then(setCatalog);
  }, []);

  async function interact(source: PetXpSource) {
    if (!pet || busySource) return;
    setBusySource(source);
    setError(null);
    try {
      const idempotencyKey = `${source}-${crypto.randomUUID()}`;
      const updated = await petsApi.interact({ source, idempotencyKey });
      setPet(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos completar la acción.");
    } finally {
      setBusySource(null);
    }
  }

  if (pet === undefined) return <div className="px-4 py-6 md:px-8">Cargando...</div>;

  if (pet === null) {
    return <AdoptFlow catalog={catalog} onAdopted={setPet} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-6 md:px-8">
      <h1 className="self-start font-display text-xl font-bold">Mi mascota</h1>

      <MenzoPet species={pet.speciesId} colors={petColorsToProps(pet.colors)} equipment={pet.equipped} size={220} />

      <div className="flex flex-col items-center gap-1">
        <h2 className="font-display text-lg font-bold">{pet.name}</h2>
        <p className="text-sm text-[var(--color-text-muted)]">{pet.speciesName}</p>
      </div>

      <LevelBadge level={pet.level} xp={pet.xp} xpForCurrentLevel={pet.xpForCurrentLevel} xpForNextLevel={pet.xpForNextLevel} />

      {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

      <div className="grid w-full grid-cols-3 gap-2">
        {INTERACTIONS.map(({ source, label }) => {
          const remaining = pet.interactionsRemainingToday?.[source] ?? 0;
          const disabled = remaining <= 0 || busySource !== null;
          return (
            <button
              key={source}
              onClick={() => interact(source)}
              disabled={disabled}
              className="flex flex-col items-center gap-1 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:border-[var(--color-orange)] enabled:cursor-pointer"
            >
              {busySource === source ? "..." : label}
              <span className="text-[11px] font-normal text-[var(--color-text-muted)]">{remaining} hoy</span>
            </button>
          );
        })}
      </div>

      <Link
        href="/pets/customize"
        className="rounded-full border border-[var(--color-border-soft)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
      >
        Personalizar
      </Link>
    </div>
  );
}

function AdoptFlow({ catalog, onAdopted }: { catalog: PetCatalogDto | null; onAdopted: (pet: PetDto) => void }) {
  const [speciesId, setSpeciesId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = catalog?.species.find((s) => s.id === speciesId) ?? null;
  const valid = !!speciesId && name.trim().length >= 2;

  async function adopt() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      const pet = await petsApi.adopt({ speciesId: speciesId!, name: name.trim() });
      onAdopted(pet);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "No pudimos adoptar tu mascota.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 px-4 py-6 md:px-8">
      <div className="text-center">
        <h1 className="font-display text-xl font-bold">Adoptá tu compañero</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Elegí una especie y ponele nombre.</p>
      </div>

      {selected && (
        <MenzoPet species={selected.id} colors={petColorsToProps(selected.defaultColors)} equipment={{}} size={180} />
      )}

      <div className="grid w-full grid-cols-3 gap-3">
        {(catalog?.species ?? []).map((s) => (
          <button
            key={s.id}
            onClick={() => setSpeciesId(s.id)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition-colors cursor-pointer ${
              speciesId === s.id ? "border-[var(--color-orange)]" : "border-transparent bg-[var(--color-surface-secondary)]"
            }`}
          >
            <MenzoPet species={s.id} colors={petColorsToProps(s.defaultColors)} equipment={{}} size={72} />
            <span className="text-xs font-medium">{s.name}</span>
          </button>
        ))}
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value.slice(0, 24))}
        placeholder="Nombre de tu mascota"
        className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-center outline-none transition-colors focus:border-[var(--color-orange)]"
      />

      {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

      <GradientButton label="Adoptar" onClick={adopt} disabled={!valid} loading={saving} />
    </div>
  );
}
