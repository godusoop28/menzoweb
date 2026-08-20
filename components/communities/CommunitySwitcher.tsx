"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ChevronDownIcon, CompassIcon, SettingsIcon } from "@/components/icons";
import { useAppState } from "@/lib/AppStateContext";
import { useCommunity } from "@/lib/communities/CommunityContext";

/** Selector de comunidad — ver Contexto §8 del pedido (selector accesible, cambiar/buscar entre
 * mis comunidades, explorar). Fase A dejó CommunityContext montado pero sin ningún consumidor;
 * este es el primer lugar que lo usa de verdad. */
export function CommunitySwitcher() {
  const { activeCommunity, activeCommunityDetail, memberships, loading, switchCommunity } = useCommunity();
  const { state } = useAppState();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const globalRole = state.profile?.globalRole;
  const isGlobalStaff = globalRole === "LEADER" || globalRole === "MASTER";
  const activeMembership = memberships.find((m) => m.community.id === activeCommunity?.id)?.membership;
  // COMMUNITY_CURATOR+ (curador, moderador, admin u owner) — igual que
  // CommunityPermissionEvaluator.requireCanEditAppearance en el backend.
  const CAN_EDIT_ROLES = new Set(["COMMUNITY_CURATOR", "COMMUNITY_MODERATOR", "COMMUNITY_ADMIN", "COMMUNITY_OWNER"]);
  const isCommunityStaff = !!activeMembership && CAN_EDIT_ROLES.has(activeMembership.communityRole);
  const canEditAppearance = !!activeCommunity && (isGlobalStaff || isCommunityStaff);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full flex-col gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3 text-left transition-colors hover:bg-[var(--color-surface-secondary)] cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <CommunityBadge
            name={activeCommunity?.name}
            iconUrl={activeCommunity?.iconUrl}
            color={activeCommunity?.primaryColor}
            size={44}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold">
              {loading ? "Cargando…" : (activeCommunity?.name ?? "Elegí una comunidad")}
            </span>
            <span className="block text-[11px] text-[var(--color-text-muted)]">
              {memberships.length} comunidad{memberships.length === 1 ? "" : "es"}
            </span>
          </span>
          <ChevronDownIcon className={`shrink-0 text-[var(--color-text-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
        {activeCommunity?.shortDescription && (
          <p className="line-clamp-2 text-xs text-[var(--color-text-secondary)]">{activeCommunity.shortDescription}</p>
        )}
        {activeCommunity && (
          <p className="text-[11px] text-[var(--color-text-muted)]">
            {activeCommunity.memberCount.toLocaleString("es-ES")} miembros
            {activeCommunityDetail && ` · ${activeCommunityDetail.onlineMemberCount} en línea`}
          </p>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 flex max-h-80 flex-col overflow-y-auto rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-1.5 shadow-xl">
          {memberships.length === 0 && !loading && (
            <p className="px-2.5 py-2 text-xs text-[var(--color-text-muted)]">Todavía no sos miembro de ninguna comunidad.</p>
          )}
          {memberships.map(({ community }) => (
            <button
              key={community.id}
              onClick={() => {
                switchCommunity(community.id);
                setOpen(false);
              }}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer ${
                community.id === activeCommunity?.id
                  ? "bg-[var(--color-surface-secondary)] font-semibold"
                  : "hover:bg-[var(--color-surface-secondary)]"
              }`}
            >
              <CommunityBadge name={community.name} iconUrl={community.iconUrl} color={community.primaryColor} size={24} />
              <span className="truncate">{community.name}</span>
            </button>
          ))}
          <div className="my-1 h-px bg-[var(--color-border-soft)]" />
          <Link
            href="/communities"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--color-cyan)] transition-colors hover:bg-[var(--color-surface-secondary)]"
          >
            <CompassIcon size={18} />
            Explorar comunidades
          </Link>
          {canEditAppearance && (
            <Link
              href={`/communities/${activeCommunity!.slug}/appearance`}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              <SettingsIcon size={18} />
              Editar apariencia
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function CommunityBadge({
  name,
  iconUrl,
  color,
  size = 32,
}: {
  name?: string;
  iconUrl?: string | null;
  color?: string | null;
  size?: number;
}) {
  const initial = name?.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white"
      style={{ width: size, height: size, background: color || "var(--color-surface-secondary)" }}
    >
      {iconUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={iconUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}
