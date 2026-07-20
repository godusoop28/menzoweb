"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAppState } from "@/lib/AppStateContext";

import { Avatar } from "./Avatar";
import { BellIcon, CalendarIcon, ChatIcon, HomeIcon, LogoutIcon, ProfileIcon, SearchIcon, SettingsIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/chat", label: "Chats", icon: ChatIcon },
  { href: "/profile", label: "Perfil", icon: ProfileIcon },
];

const SECONDARY_ITEMS = [
  { href: "/search", label: "Buscar", icon: SearchIcon },
  { href: "/events", label: "Eventos", icon: CalendarIcon },
  { href: "/notifications", label: "Notificaciones", icon: BellIcon },
  { href: "/settings", label: "Configuración", icon: SettingsIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, actions } = useAppState();
  const unread = state.social.notifications.filter((n) => !n.read).length;

  async function handleLogout() {
    await actions.logout();
    router.replace("/login");
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1100px]">
      {/* Sidebar — solo escritorio */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:gap-6 md:border-r md:border-[var(--color-border-soft)] md:px-4 md:py-6">
        <Link href="/" className="group flex items-center gap-2.5 px-2">
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-lg bg-[var(--color-orange)]/40 opacity-0 blur-lg transition-opacity group-hover:opacity-100" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/menzo-logo.png" alt="Menzo" className="h-9 w-9 rounded-xl shadow-lg" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">MENZO</span>
        </Link>

        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-to-r from-[var(--color-orange)]/15 to-transparent text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-[var(--color-orange)]" />}
                <Icon size={20} className={active ? "text-[var(--color-orange)]" : ""} />
                {item.label}
              </Link>
            );
          })}

          <div className="my-2 h-px bg-[var(--color-border-soft)]" />

          {SECONDARY_ITEMS.map((item) => {
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
      </aside>

      {/* Contenido */}
      <div className="flex-1 min-w-0">
        {/* Barra superior — solo móvil */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border-soft)] bg-[var(--color-background)]/90 px-4 py-3 backdrop-blur-md md:hidden">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/menzo-logo.png" alt="Menzo" className="h-7 w-7 rounded-lg" />
            <span className="font-display text-base font-bold">MENZO</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/search" aria-label="Buscar" className="text-[var(--color-text-secondary)]">
              <SearchIcon />
            </Link>
            <Link href="/events" aria-label="Eventos" className="text-[var(--color-text-secondary)]">
              <CalendarIcon />
            </Link>
            <Link href="/notifications" aria-label="Notificaciones" className="relative text-[var(--color-text-secondary)]">
              <BellIcon />
              {unread > 0 && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[var(--color-coral)]" />}
            </Link>
            <Link href="/settings" aria-label="Configuración" className="text-[var(--color-text-secondary)]">
              <SettingsIcon />
            </Link>
          </div>
        </div>

        <main className="pb-20 md:pb-0">{children}</main>
      </div>

      {/* Tab bar — solo móvil */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-[var(--color-border-soft)] bg-[var(--color-background-deep)]/95 backdrop-blur-md md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-[var(--color-orange)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-[var(--color-orange)]" />}
              <Icon size={22} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
