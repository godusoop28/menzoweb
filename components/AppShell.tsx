"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { useAppHeight } from "@/lib/useAppHeight";
import { useCommunity } from "@/lib/communities/CommunityContext";
import { useCommunityTheme } from "@/lib/theme/useCommunityTheme";
import { withNavDefaults } from "@/lib/communities/navigationDefaults";
import type { CommunityNavigationSectionKey } from "@/lib/api/types";

import { CommunitySwitcher } from "./communities/CommunitySwitcher";
import { MenziDjAutoplayBar } from "./music/MenziDjAutoplayBar";
import { MenziDjPlayerHost } from "./music/MenziDjPlayerHost";
import { Avatar } from "./Avatar";
import {
  BellIcon,
  BookmarkIcon,
  ChatIcon,
  CompassIcon,
  CrownIcon,
  GameIcon,
  HomeIcon,
  LiveIcon,
  LogoutIcon,
  PlusIcon,
  ProfileIcon,
  SearchIcon,
  SettingsIcon,
  UsersIcon,
} from "./icons";
import { PersistentVoiceBubble } from "./PersistentVoiceBubble";

/** Nav global de respaldo — se usa solo cuando la cuenta todavía no tiene ninguna comunidad
 * activa (ver COMMUNITY_NAV_ROUTES más abajo para el caso normal, con comunidad). */
const FALLBACK_NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/members", label: "Miembros", icon: UsersIcon },
  { href: "/chat", label: "Chats", icon: ChatIcon },
  { href: "/profile", label: "Perfil", icon: ProfileIcon },
];

/** Solo las secciones de navigationConfig que hoy tienen una pantalla real — mismo criterio que
 * components/communities/CommunityContextNav.tsx (esa tira horizontal sigue existiendo para
 * mobile; en escritorio esta barra lateral cubre el mismo rol, ver más abajo). "live" no tiene
 * una pantalla dedicada todavía, así que apunta a Chats públicos (donde ya se puede ver/entrar a
 * salas en vivo), no se inventa una ruta nueva. */
const COMMUNITY_NAV_ROUTES: Partial<Record<CommunityNavigationSectionKey, string>> = {
  home: "/",
  chats: "/chat",
  members: "/members",
  live: "/chat/public",
};
const COMMUNITY_NAV_ICONS: Partial<Record<CommunityNavigationSectionKey, typeof HomeIcon>> = {
  home: HomeIcon,
  chats: ChatIcon,
  members: UsersIcon,
  live: LiveIcon,
};

const EXPLORE_TABS: { tab: string; label: string }[] = [
  { tab: "recientes", label: "Recientes" },
  { tab: "destacados", label: "Destacados" },
  { tab: "blogs", label: "Blogs" },
  { tab: "descubrir", label: "Descubrir" },
];

const MY_STUFF_ITEMS = [
  { href: "/profile", label: "Mi perfil", icon: ProfileIcon },
  { href: "/profile?tab=wall", label: "Mi muro", icon: ChatIcon },
  { href: "/profile?tab=saved", label: "Guardados", icon: BookmarkIcon },
  { href: "/games", label: "Juegos", icon: GameIcon },
  { href: "/communities", label: "Comunidades", icon: CompassIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, actions } = useAppState();
  const accent = useAccent();
  const communityTheme = useCommunityTheme();
  const { activeCommunityDetail } = useCommunity();
  const navStyle = communityTheme.nav.style;
  const unread = state.social.notifications.filter((n) => !n.read).length;
  const isStaff = !!state.profile && state.profile.globalRole !== "USER";
  const [searchQuery, setSearchQuery] = useState("");
  useAppHeight();
  // El detalle de una sala (/chat/[id], no /chat, /chat/public ni /chat/[id]/members) es dueño de
  // su propio layout de una sola región con scroll (ver app/(app)/chat/[id]/page.tsx) — el <main>
  // compartido no debe scrollear ahí también, o el composer "sticky" termina en un punto arbitrario
  // cuando el teclado móvil cambia el viewport visual sin tocar el layout viewport.
  const isChatRoom = /^\/chat\/[^/]+$/.test(pathname) && !pathname.startsWith("/chat/public");

  // Secciones reales de la comunidad activa (navigationConfig, respetando enabled/order/label que
  // decide el líder) — mismo dato que CommunityContextNav.tsx, cae a la nav global cuando todavía
  // no hay ninguna comunidad activa.
  const communityNavSections = useMemo(() => {
    if (!activeCommunityDetail) return [];
    const nav = withNavDefaults(activeCommunityDetail.navigationConfig ?? {});
    return (Object.keys(nav) as CommunityNavigationSectionKey[])
      .map((key) => ({ key, ...nav[key]! }))
      .filter((section) => section.enabled && COMMUNITY_NAV_ROUTES[section.key])
      .sort((a, b) => a.order - b.order);
  }, [activeCommunityDetail]);

  async function handleLogout() {
    await actions.logout();
    router.replace("/login");
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-[var(--app-height,100dvh)] w-full overflow-hidden">
      {/* Sidebar — solo escritorio */}
      <aside
        // Sombra en vez de un borde sólido: un borde de 1px se veía como una costura fea cuando
        // la comunidad tiene fondo de nav (recorta la imagen de forma abrupta contra el panel
        // principal, que no comparte esa imagen) — la sombra da la misma separación visual sin
        // ese corte duro, tanto con imagen como sin ella.
        className="relative hidden md:flex md:h-full md:w-64 md:shrink-0 md:flex-col md:gap-5 md:overflow-y-auto md:px-4 md:py-6 md:shadow-[2px_0_16px_rgba(0,0,0,0.45)]"
        style={navStyle}
      >
        <div className="relative flex h-full flex-col gap-5">
          <Link href="/" className="group flex items-center gap-2.5 px-2">
            <div className="relative">
              <div className="absolute inset-0 -z-10 rounded-lg bg-[var(--color-orange)]/40 opacity-0 blur-lg transition-opacity group-hover:opacity-100" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/branding/menzo-logo.png" alt="Menzo" className="h-9 w-9 rounded-xl shadow-lg" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">MENZO</span>
          </Link>

          <CommunitySwitcher />

          <nav className="flex flex-col gap-1">
            {communityNavSections.length > 0
              ? communityNavSections.map((section) => {
                  const href = COMMUNITY_NAV_ROUTES[section.key]!;
                  const Icon = COMMUNITY_NAV_ICONS[section.key] ?? HomeIcon;
                  const active = isActive(href);
                  return (
                    <Link
                      key={section.key}
                      href={href}
                      style={active ? { background: `linear-gradient(to right, ${accent.color}26, transparent)` } : undefined}
                      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
                          style={{ background: accent.color }}
                        />
                      )}
                      <span style={active ? { color: accent.color } : undefined}>
                        <Icon size={20} />
                      </span>
                      {section.label}
                    </Link>
                  );
                })
              : FALLBACK_NAV_ITEMS.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={active ? { background: `linear-gradient(to right, ${accent.color}26, transparent)` } : undefined}
                      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                        active
                          ? "text-[var(--color-text-primary)]"
                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full"
                          style={{ background: accent.color }}
                        />
                      )}
                      <span style={active ? { color: accent.color } : undefined}>
                        <Icon size={20} />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
          </nav>

          <div className="flex flex-col gap-1.5">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Explorar</p>
            {EXPLORE_TABS.map(({ tab, label }) => (
              <Link
                key={tab}
                href={`/?tab=${tab}`}
                className="rounded-xl px-3 py-1.5 text-sm text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Mis cosas</p>
            {MY_STUFF_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
            {isStaff && (
              <Link
                href="/admin"
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <CrownIcon size={18} />
                Admin
              </Link>
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2">
            <Link
              href="/"
              style={{ background: accent.color }}
              className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--color-text-on-accent)] transition-opacity hover:opacity-90"
            >
              <PlusIcon size={16} />
              Crear publicación
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <SettingsIcon size={18} />
              Configuración
            </Link>
            {state.profile && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] py-2.5 pl-2.5 pr-1.5">
                <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar
                    name={state.profile.displayName}
                    avatarUri={state.profile.avatarUri}
                    gradient={state.profile.avatarGradient}
                    size={36}
                    showOnline
                    online
                    level={state.profile.level}
                  />
                  <span className="truncate text-sm font-medium">{state.profile.displayName}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  aria-label="Cerrar sesión"
                  title="Cerrar sesión"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-coral)] cursor-pointer"
                >
                  <LogoutIcon size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Columna derecha: barra superior de escritorio + contenido — única región con scroll,
          para no anidar scrolls, EXCEPTO en /chat/[id]: esa ruta administra su propia región de
          scroll (solo los mensajes). */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Barra superior — solo móvil, oculta dentro del detalle de una sala (ya tiene su propio
            header con botón de volver, y en móvil no hay espacio para dos cabeceras). */}
        {!isChatRoom && (
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-background)]/90 px-4 py-3 backdrop-blur-md md:hidden">
            <Link href="/" className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/branding/menzo-logo.png" alt="Menzo" className="h-7 w-7 rounded-lg" />
              <span className="font-display text-base font-bold">MENZO</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/communities" aria-label="Comunidades" className="text-[var(--color-text-secondary)]">
                <CompassIcon />
              </Link>
              <Link href="/search" aria-label="Buscar" className="text-[var(--color-text-secondary)]">
                <SearchIcon />
              </Link>
              <Link href="/notifications" aria-label="Notificaciones" className="relative text-[var(--color-text-secondary)]">
                <BellIcon />
                {unread > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--color-coral)]" />}
              </Link>
              <Link href="/settings" aria-label="Configuración" className="text-[var(--color-text-secondary)]">
                <SettingsIcon />
              </Link>
              {isStaff && (
                <Link href="/admin" aria-label="Admin" className="text-[var(--color-text-secondary)]">
                  <CrownIcon />
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Barra superior — solo escritorio: buscador + Crear + notificaciones + mensajes +
            avatar. Antes esto no existía en escritorio (buscar/notificaciones solo vivían en el
            sidebar); ahora el sidebar es la nav de la comunidad y esto cubre lo global. */}
        {!isChatRoom && (
          <div className="hidden shrink-0 items-center gap-3 border-b border-[var(--color-border-soft)] bg-[var(--color-background)]/90 px-6 py-3 backdrop-blur-md md:flex">
            <form onSubmit={handleSearchSubmit} className="max-w-xs flex-1">
              <div className="flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3.5 py-2">
                <SearchIcon size={16} className="shrink-0 text-[var(--color-text-muted)]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar en Menzo…"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]"
                />
              </div>
            </form>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href="/"
                style={{ background: accent.color }}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-[var(--color-text-on-accent)] transition-opacity hover:opacity-90"
              >
                <PlusIcon size={16} />
                Crear
              </Link>
              <Link
                href="/notifications"
                aria-label="Notificaciones"
                className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
              >
                <BellIcon size={19} />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-coral)]" />
                )}
              </Link>
              <Link
                href="/chat"
                aria-label="Mensajes"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
              >
                <ChatIcon size={19} />
              </Link>
              {state.profile && (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-[var(--color-surface-secondary)]"
                >
                  <Avatar
                    name={state.profile.displayName}
                    avatarUri={state.profile.avatarUri}
                    gradient={state.profile.avatarGradient}
                    size={30}
                  />
                  <span className="flex flex-col leading-tight">
                    <span className="text-xs font-semibold">{state.profile.displayName}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">Nivel {state.profile.level}</span>
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}

        <main
          className={
            isChatRoom
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "min-h-0 flex-1 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0"
          }
        >
          {children}
        </main>
      </div>

      {/* Tab bar — solo móvil, oculta dentro del detalle de una sala: no hay lugar para header +
          mensajes + composer + teclado + tab bar a la vez, y la sala ya tiene su propio botón de
          volver. Reaparece al salir de la sala. */}
      {!isChatRoom && (
        <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-[var(--color-border-soft)] bg-[var(--color-background-deep)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
          {FALLBACK_NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={active ? { color: accent.color } : undefined}
                className={`relative flex flex-1 flex-col items-center gap-1 pt-2.5 pb-2.5 text-[11px] font-medium transition-colors ${
                  active ? "" : "text-[var(--color-text-muted)]"
                }`}
              >
                {active && (
                  <span className="absolute top-0 h-0.5 w-8 rounded-full" style={{ background: accent.color }} />
                )}
                <Icon size={22} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}

      <PersistentVoiceBubble />
      <MenziDjPlayerHost />
      <MenziDjAutoplayBar />
    </div>
  );
}
