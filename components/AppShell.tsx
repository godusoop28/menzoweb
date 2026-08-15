"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { useCommunity } from "@/lib/communities/CommunityContext";
import { useAppHeight } from "@/lib/useAppHeight";

import { CommunitySwitcher } from "./communities/CommunitySwitcher";
import { MenziDjAutoplayBar } from "./music/MenziDjAutoplayBar";
import { MenziDjPlayerHost } from "./music/MenziDjPlayerHost";
import { Avatar } from "./Avatar";
import { BellIcon, ChatIcon, CompassIcon, CrownIcon, HomeIcon, LogoutIcon, ProfileIcon, SearchIcon, SettingsIcon, UsersIcon } from "./icons";
import { PersistentVoiceBubble } from "./PersistentVoiceBubble";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/members", label: "Miembros", icon: UsersIcon },
  { href: "/chat", label: "Chats", icon: ChatIcon },
  { href: "/profile", label: "Perfil", icon: ProfileIcon },
];

const SECONDARY_ITEMS = [
  { href: "/communities", label: "Comunidades", icon: CompassIcon },
  { href: "/chat/public", label: "Chats públicos", icon: ChatIcon },
  { href: "/search", label: "Buscar", icon: SearchIcon },
  { href: "/notifications", label: "Notificaciones", icon: BellIcon },
  { href: "/settings", label: "Configuración", icon: SettingsIcon },
];

const ADMIN_ITEM = { href: "/admin", label: "Admin", icon: CrownIcon };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, actions } = useAppState();
  const accent = useAccent();
  const { activeCommunityDetail } = useCommunity();
  const navBackgroundUrl = activeCommunityDetail?.themeConfig?.navBackgroundUrl;
  const unread = state.social.notifications.filter((n) => !n.read).length;
  const isStaff = !!state.profile && state.profile.globalRole !== "USER";
  const secondaryItems = isStaff ? [...SECONDARY_ITEMS, ADMIN_ITEM] : SECONDARY_ITEMS;
  useAppHeight();
  // El detalle de una sala (/chat/[id], no /chat, /chat/public ni /chat/[id]/members) es dueño de
  // su propio layout de una sola región con scroll (ver app/(app)/chat/[id]/page.tsx) — el <main>
  // compartido no debe scrollear ahí también, o el composer "sticky" termina en un punto arbitrario
  // cuando el teclado móvil cambia el viewport visual sin tocar el layout viewport.
  const isChatRoom = /^\/chat\/[^/]+$/.test(pathname) && !pathname.startsWith("/chat/public");

  async function handleLogout() {
    await actions.logout();
    router.replace("/login");
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="mx-auto flex h-[var(--app-height,100dvh)] w-full max-w-[1100px] overflow-hidden">
      {/* Sidebar — solo escritorio */}
      <aside
        // Sombra en vez de un borde sólido: un borde de 1px se veía como una costura fea cuando
        // la comunidad tiene fondo de nav (recorta la imagen de forma abrupta contra el panel
        // principal, que no comparte esa imagen) — la sombra da la misma separación visual sin
        // ese corte duro, tanto con imagen como sin ella.
        className="relative hidden md:flex md:h-full md:w-64 md:flex-col md:gap-6 md:overflow-y-auto md:px-4 md:py-6 md:shadow-[2px_0_16px_rgba(0,0,0,0.45)]"
        style={
          navBackgroundUrl
            ? { backgroundImage: `url(${navBackgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      >
        {navBackgroundUrl && <div className="pointer-events-none absolute inset-0" style={{ background: "rgba(7,9,13,0.88)" }} />}
        <div className="relative flex h-full flex-col gap-6">
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
          {NAV_ITEMS.map((item) => {
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

          <div className="my-2 h-px bg-[var(--color-border-soft)]" />

          {secondaryItems.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Icon size={20} />
                {item.label}
                {item.href === "/notifications" && unread > 0 && (
                  <span className="ml-auto rounded-full bg-[var(--color-coral)] px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          {state.profile && (
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-2.5 py-2.5 transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
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
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-coral)] cursor-pointer"
          >
            <LogoutIcon size={18} />
            Cerrar sesión
          </button>
        </div>
        </div>
      </aside>

      {/* Contenido — única región con scroll, para no anidar scrolls, EXCEPTO en /chat/[id]: esa
          ruta administra su propia región de scroll (solo los mensajes) y este <main> se vuelve un
          contenedor de altura fija sin scroll propio, para que header y composer no compitan con
          él por el mismo scroll. */}
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
          {NAV_ITEMS.map((item) => {
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
