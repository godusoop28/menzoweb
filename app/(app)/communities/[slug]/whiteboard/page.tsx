"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ApiError, communitiesApi } from "@/lib/api";
import type { CommunityDetailDto } from "@/lib/api/types";
import { WhiteboardCanvas } from "@/components/whiteboard/WhiteboardCanvas";
import { BackIcon } from "@/components/icons";

const MODERATOR_ROLES = new Set(["COMMUNITY_MODERATOR", "COMMUNITY_ADMIN", "COMMUNITY_OWNER"]);

/** Mismo patrón de resolución que communities/[slug]/appearance/page.tsx — se busca la comunidad
 * por slug de la URL, no la "activa" del contexto global (la pizarra que se está viendo es la de
 * ESTA comunidad, sin importar cuál sea la activa en el resto de la app). */
export default function CommunityWhiteboardPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const [community, setCommunity] = useState<CommunityDetailDto | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    communitiesApi
      .getBySlug(params.slug)
      .then(setCommunity)
      .catch((e) => {
        setError(e instanceof ApiError ? e.message : "No pudimos cargar la comunidad.");
        setCommunity(null);
      });
  }, [params.slug]);

  if (community === undefined) return <div className="px-4 py-6 md:px-8">Cargando...</div>;
  if (community === null) {
    return (
      <div className="px-4 py-6 md:px-8">
        <p className="text-sm text-[var(--color-coral)]">{error ?? "Comunidad no encontrada."}</p>
      </div>
    );
  }

  const canClear = !!community.myMembership && MODERATOR_ROLES.has(community.myMembership.communityRole);

  return (
    <div className="mx-auto flex h-[calc(100dvh-64px)] w-full max-w-5xl flex-col gap-3 px-4 py-4 md:px-8">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-secondary)] cursor-pointer hover:bg-[var(--color-surface-secondary)]"
        >
          <BackIcon size={18} />
        </button>
        <h1 className="font-display text-lg font-bold">Pizarra de {community.name}</h1>
      </div>
      <WhiteboardCanvas communityId={community.id} canClear={canClear} />
    </div>
  );
}
