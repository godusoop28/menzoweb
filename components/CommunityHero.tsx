"use client";

import Link from "next/link";

import type { DemoUser } from "@/lib/types";
import { useCommunity } from "@/lib/communities/CommunityContext";

import { Avatar } from "./Avatar";

/** Hero de la comunidad activa (Naruto, Anime, etc.) — antes mostraba /banners/banner-community.png
 * fijo + datos de la config singleton de Menzo-plataforma (communityApi.config()), sin relación
 * con la comunidad multi-comunidad nueva. Ahora usa activeCommunityDetail: si el líder/admin/
 * curador puso portada/banner en "Editar apariencia", se ve acá; si no puso ninguna, cae a un
 * degradé con los colores de la comunidad en vez de una imagen genérica del sistema. */
export function CommunityHero({ previewMembers }: { previewMembers?: DemoUser[] }) {
  const { activeCommunityDetail: community } = useCommunity();

  if (!community) return null;

  const heroImage = community.coverUrl || community.bannerUrl;
  const primary = community.primaryColor || "#e74c3c";
  const secondary = community.secondaryColor || "#2c3e50";

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
      <div className="relative flex flex-col gap-1.5 p-6 text-white">
        <h2 className="font-display text-2xl font-bold">{community.name}</h2>
        {community.shortDescription && <p className="font-medium text-white/85">{community.shortDescription}</p>}

        <div className="mt-2 flex items-center gap-2 text-sm text-white/85">
          <span>{community.memberCount.toLocaleString("es-ES")} miembros</span>
          <span className="h-1 w-1 rounded-full bg-white/60" />
          <span>{community.onlineMemberCount} conectados</span>
        </div>

        {previewMembers && previewMembers.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
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
          <div className="mt-3 flex flex-wrap gap-2">
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
