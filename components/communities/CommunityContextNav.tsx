"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

import type { CommunityNavigationSectionKey } from "@/lib/api/types";
import { useCommunity } from "@/lib/communities/CommunityContext";
import { withNavDefaults } from "@/lib/communities/navigationDefaults";

/** Solo las secciones que hoy tienen una pantalla real en menzoweb. El resto
 * (posts/blogs/live/events/about) ya se puede configurar y guardar desde el editor de
 * apariencia, pero todavía no tiene una ruta dedicada — se suman acá a medida que existan, para
 * no renderizar links muertos hacia pantallas que no existen. */
const SECTION_ROUTES: Partial<Record<CommunityNavigationSectionKey, string>> = {
  home: "/",
  chats: "/chat",
  members: "/members",
};

const MAX_VISIBLE = 5;

/** Subnavegación horizontal de la comunidad activa, construida desde navigationConfig (orden,
 * label y visibilidad los decide el líder desde /communities/[slug]/appearance). Distinta de la
 * navegación global de Menzo (AppShell) — esta tira es puramente contextual a la comunidad. */
export function CommunityContextNav() {
  const pathname = usePathname();
  const { activeCommunityDetail } = useCommunity();
  const [showMore, setShowMore] = useState(false);

  const sections = useMemo(() => {
    if (!activeCommunityDetail) return [];
    const nav = withNavDefaults(activeCommunityDetail.navigationConfig ?? {});
    return (Object.keys(nav) as CommunityNavigationSectionKey[])
      .map((key) => ({ key, ...nav[key]! }))
      .filter((section) => section.enabled && SECTION_ROUTES[section.key])
      .sort((a, b) => a.order - b.order);
  }, [activeCommunityDetail]);

  if (sections.length === 0) return null;

  const visible = sections.slice(0, MAX_VISIBLE);
  const overflow = sections.slice(MAX_VISIBLE);

  return (
    <nav className="menzo-fade-in flex items-center gap-2 overflow-x-auto pb-1">
      {visible.map((section) => {
        const href = SECTION_ROUTES[section.key]!;
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={section.key}
            href={href}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]"
                : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            {section.label}
          </Link>
        );
      })}

      {overflow.length > 0 && (
        <div className="relative shrink-0">
          <button
            onClick={() => setShowMore((v) => !v)}
            className="rounded-full bg-[var(--color-surface-secondary)] px-4 py-1.5 text-sm font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text-primary)]"
          >
            Más
          </button>
          {showMore && (
            <div className="absolute left-0 top-[calc(100%+6px)] z-10 flex min-w-40 flex-col gap-1 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-2 shadow-xl">
              {overflow.map((section) => (
                <Link
                  key={section.key}
                  href={SECTION_ROUTES[section.key]!}
                  onClick={() => setShowMore(false)}
                  className="rounded-xl px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  {section.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
