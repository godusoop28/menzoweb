"use client";

import Link from "next/link";
import { useState } from "react";

import type { DemoUser } from "@/lib/types";
import { useCommunity } from "@/lib/communities/CommunityContext";

import { Avatar } from "./Avatar";
import { CheckIcon } from "./icons";

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
 * degradé con los colores de la comunidad en vez de una imagen genérica del sistema. */
export function CommunityHero({ previewMembers }: { previewMembers?: DemoUser[] }) {
  const { activeCommunityDetail: community, joinCommunity, leaveCommunity } = useCommunity();
  const [membershipBusy, setMembershipBusy] = useState(false);

  if (!community) return null;

  const heroImage = community.coverUrl || community.bannerUrl;
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

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-xl">
      {heroImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
        />
      )}
      <div className="absolute inset-0 bg-[rgba(7,9,13,0.42)]" />
      <div className="relative flex flex-col gap-3 p-6 text-white">
        <div className="flex items-start gap-3.5">
          {community.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.iconUrl}
              alt=""
              className="h-16 w-16 shrink-0 rounded-full object-cover shadow-[0_0_0_3px_rgba(255,255,255,0.15),0_0_20px_-4px_rgba(0,0,0,0.6)]"
            />
          ) : (
            <div className="shrink-0">
              <Avatar name={community.name} gradient="community" size={64} />
            </div>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="flex items-center gap-1.5 font-display text-2xl font-bold">
                {community.name}
                {community.official && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-purple)]" title="Comunidad oficial">
                    <CheckIcon size={12} />
                  </span>
                )}
              </h2>
              <button
                onClick={handleToggleMembership}
                disabled={membershipBusy}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:cursor-wait disabled:opacity-60 ${
                  isMember
                    ? "border border-white/25 bg-white/10 text-white hover:bg-white/20"
                    : "bg-[var(--color-orange)] text-[var(--color-text-on-accent)] hover:brightness-110"
                }`}
              >
                {isMember ? "Siguiendo" : "Seguir"}
              </button>
            </div>
            {community.shortDescription && <p className="font-medium text-white/85">{community.shortDescription}</p>}
          </div>
        </div>

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

        {previewMembers && previewMembers.length > 0 && (
          <div className="mt-1 flex items-center gap-3">
            <div className="flex">
              {previewMembers.slice(0, 4).map((member, index) => (
                <div key={member.id} className="rounded-full ring-2 ring-[rgba(7,9,13,0.6)]" style={{ marginLeft: index === 0 ? 0 : -10 }}>
                  <Avatar name={member.displayName} avatarUri={member.avatarUri} gradient={member.avatarGradient} size={32} />
                </div>
              ))}
            </div>
            <Link
              href="/members"
              className="rounded-full border border-white/25 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              Ver comunidad
            </Link>
          </div>
        )}

        {community.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {community.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
