"use client";

import { useState } from "react";

import { useCommunity } from "@/lib/communities/CommunityContext";
import { useToast } from "@/lib/ToastContext";

import { CheckIcon, ShareIcon } from "./icons";

function formatCreatedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return `Creada el ${date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}`;
}

/** Hero de la comunidad activa (Naruto, Anime, etc.) — antes mostraba /banners/banner-community.png
 * fijo + datos de la config singleton de Menzo-plataforma (communityApi.config()), sin relación
 * con la comunidad multi-comunidad nueva. Ahora usa activeCommunityDetail: si el líder/admin/
 * curador puso portada/banner en "Editar apariencia", se ve acá; si no puso ninguna, cae a un
 * degradé con los colores de la comunidad en vez de una imagen genérica del sistema.
 *
 * Layout ajustado a las referencias de diseño (diseñoWeb/): altura mínima generosa para que el
 * arte de portada realmente se note en vez de recortarse al alto del contenido, contenido anclado
 * abajo con degradado de arriba hacia abajo (el arte respira arriba, el texto tiene contraste
 * abajo), acciones (Compartir/Seguir) flotando arriba a la derecha en vez de apretadas al lado del
 * nombre, y los tags de la comunidad como fila de píldoras justo debajo del nombre. */
export function CommunityHero() {
  const { activeCommunityDetail: community, joinCommunity, leaveCommunity } = useCommunity();
  const [membershipBusy, setMembershipBusy] = useState(false);
  const showToast = useToast();

  if (!community) return null;

  const heroImage = community.coverUrl || community.bannerUrl;
  const emblemImage = community.logoUrl || community.iconUrl;
  const primary = community.primaryColor || "#e74c3c";
  const secondary = community.secondaryColor || "#2c3e50";
  const isMember = !!community.myMembership;
  const createdLabel = formatCreatedAt(community.createdAt);

  async function handleToggleMembership() {
    if (membershipBusy) return;
    setMembershipBusy(true);
    try {
      if (isMember) await leaveCommunity(community!.id);
      else await joinCommunity(community!.id);
    } finally {
      setMembershipBusy(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/communities/${community!.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: community!.name, url });
      } catch {
        // Usuario canceló el share sheet — no es un error a mostrar.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast("Enlace copiado");
    } catch {
      showToast("No pudimos copiar el enlace");
    }
  }

  return (
    <div className="relative flex min-h-[280px] flex-col justify-end overflow-hidden rounded-3xl shadow-xl">
      {heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(7,9,13,0.92)] via-[rgba(7,9,13,0.4)] to-[rgba(7,9,13,0.05)]" />

      <div className="absolute right-4 top-4 flex shrink-0 gap-2 md:right-6 md:top-6">
        <button
          onClick={handleShare}
          className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/20 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/35 cursor-pointer"
        >
          <ShareIcon size={14} />
          Compartir
        </button>
        <button
          onClick={handleToggleMembership}
          disabled={membershipBusy}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
            isMember
              ? "border border-white/25 bg-white/10 text-white hover:bg-white/20"
              : "bg-[var(--color-orange)] text-[var(--color-text-on-accent)] hover:brightness-110"
          }`}
        >
          {isMember ? "Siguiendo" : "Seguir"}
        </button>
      </div>

      <div className="relative flex flex-col gap-3 p-6 pt-16 text-white md:p-8 md:pt-16">
        <div className="flex items-center gap-4">
          {emblemImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={emblemImage}
              alt=""
              className="h-20 w-20 shrink-0 rounded-full object-cover shadow-[0_0_0_3px_rgba(255,255,255,0.15),0_0_24px_-2px_rgba(0,0,0,0.6)]"
              style={{ boxShadow: `0 0 0 3px rgba(255,255,255,0.15), 0 0 28px 2px ${primary}55` }}
            />
          ) : (
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold text-white shadow-lg"
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
            >
              {community.name.trim().charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="flex min-w-0 flex-1 items-center gap-1.5 font-display text-2xl font-bold md:text-3xl">
            <span className="truncate">{community.name}</span>
            {community.official && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-purple)]" title="Comunidad oficial">
                <CheckIcon size={12} />
              </span>
            )}
          </h2>
        </div>

        {community.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {community.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
                {tag}
              </span>
            ))}
          </div>
        )}

        {community.shortDescription && <p className="max-w-xl font-medium text-white/85">{community.shortDescription}</p>}

        <div className="flex flex-wrap items-center gap-2 text-sm text-white/85">
          <span>{community.memberCount.toLocaleString("es-ES")} miembros</span>
          <span className="h-1 w-1 rounded-full bg-white/60" />
          <span>{community.onlineMemberCount} conectados</span>
          {createdLabel && (
            <>
              <span className="h-1 w-1 rounded-full bg-white/60" />
              <span>{createdLabel}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
