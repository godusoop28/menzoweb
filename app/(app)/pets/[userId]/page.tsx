"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { petsApi } from "@/lib/api";
import type { PetDto } from "@/lib/api/types";
import { LevelBadge } from "@/components/LevelBadge";
import { MenzoPet } from "@/components/pets/MenzoPet";
import { petColorsToProps } from "@/lib/pets/petColors";

/** Vista pública de la mascota de otro usuario — solo lectura, sin botones de interacción (esos
 * viven en /pets, la mascota propia). 404 si esa persona no tiene mascota. */
export default function PublicPetPage() {
  const params = useParams<{ userId: string }>();
  const [pet, setPet] = useState<PetDto | null | undefined>(undefined);

  useEffect(() => {
    petsApi
      .ofUser(params.userId)
      .then(setPet)
      .catch(() => setPet(null));
  }, [params.userId]);

  if (pet === undefined) return <div className="px-4 py-6 md:px-8">Cargando...</div>;
  if (pet === null) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-6 text-center text-sm text-[var(--color-text-muted)] md:px-8">
        Esta persona no tiene una mascota todavía.
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-6 md:px-8">
      <MenzoPet species={pet.speciesId} colors={petColorsToProps(pet.colors)} equipment={pet.equipped} size={220} />
      <div className="flex flex-col items-center gap-1">
        <h1 className="font-display text-lg font-bold">{pet.name}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {pet.speciesName} · de {pet.ownerDisplayName}
        </p>
      </div>
      <LevelBadge level={pet.level} xp={pet.xp} xpForCurrentLevel={pet.xpForCurrentLevel} xpForNextLevel={pet.xpForNextLevel} />
    </div>
  );
}
