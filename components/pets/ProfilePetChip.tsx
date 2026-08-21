"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { petsApi } from "@/lib/api";
import type { PetDto } from "@/lib/api/types";
import { petColorsToProps } from "@/lib/pets/petColors";
import { MenzoPet } from "./MenzoPet";

/** Chip compacto de mascota para el hero de perfil (propio o ajeno) — no renderiza nada si esa
 * persona no tiene mascota. `userId` es el id REAL de backend (no el alias local), ver
 * ProfileHero.tsx: quien llama resuelve isSelf/getMyRealId antes de pasarlo. */
export function ProfilePetChip({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [pet, setPet] = useState<PetDto | null | undefined>(undefined);

  useEffect(() => {
    const call = isSelf ? petsApi.mine() : petsApi.ofUser(userId);
    call.then(setPet).catch(() => setPet(null));
  }, [userId, isSelf]);

  if (!pet) return null;

  return (
    <Link
      href={isSelf ? "/pets" : `/pets/${userId}`}
      className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] py-1 pl-1 pr-3 transition-colors hover:border-[var(--color-orange)]"
    >
      <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full">
        <MenzoPet species={pet.speciesId} colors={petColorsToProps(pet.colors)} equipment={pet.equipped} size={32} />
      </span>
      <span className="text-xs font-medium">
        {pet.name} <span className="text-[var(--color-text-muted)]">· Nivel {pet.level}</span>
      </span>
    </Link>
  );
}
