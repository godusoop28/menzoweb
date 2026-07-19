"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAppState } from "@/lib/AppStateContext";

import { Avatar } from "./Avatar";
import { ChatIcon, HomeIcon, LogoutIcon, ProfileIcon } from "./icons";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: HomeIcon },
  { href: "/chat", label: "Chats", icon: ChatIcon },
  { href: "/profile", label: "Perfil", icon: ProfileIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, actions } = useAppState();

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
        <Link href="/" className="flex items-center gap-2 px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/menzo-logo.png" alt="Menzo" className="h-8 w-8 rounded-lg" />
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          {state.profile && (
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-[var(--color-surface-secondary)]"
            >
              <Avatar
                name={state.profile.displayName}
                avatarUri={state.profile.avatarUri}
                gradient={state.profile.avatarGradient}
                size={36}
              />
              <span className="truncate text-sm font-medium">{state.profile.displayName}</span>
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)] hover:text-[var(--color-coral)] cursor-pointer"
          >
            <LogoutIcon size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Contenido */}
      <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>

      {/* Tab bar — solo móvil */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 flex border-t border-[var(--color-border-soft)] bg-[var(--color-background-deep)]/95 backdrop-blur md:hidden">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              <Icon size={22} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
