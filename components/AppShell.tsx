"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { useAppHeight } from "@/lib/useAppHeight";
import { useSwipeNavigation } from "@/lib/useSwipeNavigation";
import { useCommunity } from "@/lib/communities/CommunityContext";
import { useCommunityTheme } from "@/lib/theme/useCommunityTheme";
import { withNavDefaults } from "@/lib/communities/navigationDefaults";
import type { CommunityNavigationSectionConfig, CommunityNavigationSectionKey } from "@/lib/api/types";
import type { ResolvedCommunityTheme } from "@/lib/theme/communityTheme";
import type { UserProfile } from "@/lib/types";

import { CommunitySwitcher } from "./communities/CommunitySwitcher";
import { MenziDjAutoplayBar } from "./music/MenziDjAutoplayBar";
import { MenziDjPlayerHost } from "./music/MenziDjPlayerHost";
import { Avatar } from "./Avatar";
import {
  BellIcon,
  BookmarkIcon,
  ChatIcon,
  ChevronDownIcon,
  CloseIcon,
  CompassIcon,
  CrownIcon,
  HomeIcon,
  LiveIcon,
  LogoutIcon,
  MenuIcon,
  PaletteIcon,
  PawIcon,
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
  { href: "/members", label: "Comunidad", icon: UsersIcon },
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

const MY_STUFF_ITEMS = [
  { href: "/profile", label: "Mi perfil", icon: ProfileIcon },
  { href: "/profile?tab=wall", label: "Mi muro", icon: ChatIcon },
  { href: "/profile?tab=saved", label: "Guardados", icon: BookmarkIcon },
  { href: "/pets", label: "Mi mascota", icon: PawIcon },
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
  // Badge real de "Salas en vivo" en el nav — a diferencia de un contador de mensajes no
  // leídos (que no existe en el backend, ver auditoría de confiabilidad), esto sí es un dato
  // real ya disponible en el store.
  const liveRoomCount = state.social.rooms.filter((r) => r.type === "public" && r.live).length;
  const isStaff = !!state.profile && state.profile.globalRole !== "USER";
  const [searchQuery, setSearchQuery] = useState("");
  // Sección 13 del rediseño — antes el avatar de la topbar de escritorio era un `<Link>` liso a
  // /profile, sin ningún dropdown real (nivel/configuración/cerrar sesión solo estaban
  // disponibles desde la card del sidebar en mobile). Popover controlado, mismo patrón que el
  // selector de reacciones de LiveRoomPanel (capa invisible atrás para cerrar al tocar afuera).
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  // Drawer hamburguesa — solo mobile (ver sección "nav responsive" del pedido): antes el
  // <aside> de abajo era md:flex, invisible por completo en mobile, así que Miembros/Explorar/
  // Salas en vivo (y todo lo que arma communityNavSections) directamente no existían ahí.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  useAppHeight();
  // El detalle de una sala (/chat/[id], no /chat, /chat/public ni /chat/[id]/members) es dueño de
  // su propio layout de una sola región con scroll (ver app/(app)/chat/[id]/page.tsx) — el <main>
  // compartido no debe scrollear ahí también, o el composer "sticky" termina en un punto arbitrario
  // cuando el teclado móvil cambia el viewport visual sin tocar el layout viewport.
  const isChatRoom = /^\/chat\/[^/]+$/.test(pathname) && !pathname.startsWith("/chat/public");
  // La lista de Chats pide su propio header (título "Chats" + buscar/nueva conversación en vez
  // de la marca genérica "Menzo" + notificaciones) — mismo criterio que MenzoHeader en Flutter,
  // que ya varía título/acciones por pantalla; acá es la única ruta que lo hace distinto del
  // resto (todas las demás siguen mostrando la marca genérica).
  const isChatsList = pathname === "/chat";
  const swipeNav = useSwipeNavigation();

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
    <div className="flex h-[var(--app-height,100dvh)] w-full flex-col overflow-hidden">
      {/* Topbar de ancho completo (sección 12/13 del rediseño — antes esta barra vivía metida
          adentro de la columna de contenido, sin alinearse con el ancho real de la sidebar; el
          blueprint la tiene como una fila propia que corre por arriba de sidebar + contenido).
          La celda izquierda mide exactamente lo mismo que la sidebar de abajo para que la marca
          quede alineada con la columna, igual que .topbar/.brand en web/styles.css. */}
      <header className="hidden shrink-0 border-b border-[var(--color-border-soft)] bg-[var(--color-background)]/90 backdrop-blur-md md:grid md:grid-cols-[256px_minmax(0,1fr)]">
        <Link href="/" className="group flex items-center gap-2.5 border-r border-[var(--color-border-soft)] px-5">
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-lg bg-[var(--color-orange)]/40 opacity-0 blur-lg transition-opacity group-hover:opacity-100" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/menzo-logo.png" alt="Menzo" className="h-8 w-8 rounded-xl shadow-lg" />
          </div>
          <span className="font-display text-base font-bold tracking-tight">MENZO</span>
        </Link>
        <div className="flex items-center gap-3 px-6 py-3">
          <form onSubmit={handleSearchSubmit} className="max-w-sm flex-1">
            <div className="flex items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3.5 py-2">
              <SearchIcon size={16} className="shrink-0 text-[var(--color-text-muted)]" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeCommunityDetail ? `Buscar en ${activeCommunityDetail.name}…` : "Buscar en Menzo…"}
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
              {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-coral)]" />}
            </Link>
            <Link
              href="/chat"
              aria-label="Mensajes"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              <ChatIcon size={19} />
            </Link>
            {state.profile && (
              <div className="relative">
                <button
                  onClick={() => setAccountMenuOpen((v) => !v)}
                  className="flex cursor-pointer items-center gap-2 rounded-full py-1 pl-1 pr-2.5 transition-colors hover:bg-[var(--color-surface-secondary)]"
                >
                  <Avatar
                    name={state.profile.displayName}
                    avatarUri={state.profile.avatarUri}
                    gradient={state.profile.avatarGradient}
                    size={30}
                  />
                  <span className="flex flex-col items-start leading-tight">
                    <span className="text-xs font-semibold">{state.profile.displayName}</span>
                    <span className="text-[10px] text-[var(--color-text-muted)]">Nivel {state.profile.level}</span>
                  </span>
                  <ChevronDownIcon size={14} className="ml-0.5 text-[var(--color-text-muted)]" />
                </button>
                {accountMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAccountMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-xl">
                      <Link
                        href="/profile"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--color-surface-secondary)]"
                      >
                        <ProfileIcon size={16} /> Mi perfil
                      </Link>
                      <Link
                        href="/settings"
                        onClick={() => setAccountMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors hover:bg-[var(--color-surface-secondary)]"
                      >
                        <SettingsIcon size={16} /> Configuración
                      </Link>
                      <div className="border-t border-[var(--color-border-soft)]" />
                      <button
                        onClick={() => {
                          setAccountMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm text-[var(--color-coral)] transition-colors hover:bg-[var(--color-surface-secondary)]"
                      >
                        <LogoutIcon size={16} /> Cerrar sesión
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 w-full flex-1 overflow-hidden">
      {/* Sidebar — solo escritorio. El mismo contenido (SidebarNavContent) se reusa en el drawer
          mobile de abajo — antes esas secciones (Miembros, Explorar, Salas en vivo con badge,
          etc.) vivían ÚNICAMENTE acá (md:flex, invisible por completo en mobile), así que en
          viewport chico faltaban de verdad, no era solo un tema de estilo. */}
      <aside
        // Sombra en vez de un borde sólido: un borde de 1px se veía como una costura fea cuando
        // la comunidad tiene fondo de nav (recorta la imagen de forma abrupta contra el panel
        // principal, que no comparte esa imagen) — la sombra da la misma separación visual sin
        // ese corte duro, tanto con imagen como sin ella.
        className="relative hidden md:flex md:h-full md:w-64 md:shrink-0 md:flex-col md:gap-1 md:overflow-y-auto md:px-3.5 md:py-4 md:shadow-[2px_0_16px_rgba(0,0,0,0.45)]"
        style={navStyle}
      >
        <SidebarNavContent
          communityTheme={communityTheme}
          communityNavSections={communityNavSections}
          liveRoomCount={liveRoomCount}
          isStaff={isStaff}
          profile={state.profile}
          accent={accent}
          isActive={isActive}
          onLogout={handleLogout}
          activeCommunitySlug={activeCommunityDetail?.slug ?? null}
        />
      </aside>

      {/* Columna derecha: barra superior de escritorio + contenido — única región con scroll,
          para no anidar scrolls, EXCEPTO en /chat/[id]: esa ruta administra su propia región de
          scroll (solo los mensajes). */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* Barra superior — solo móvil, oculta dentro del detalle de una sala (ya tiene su propio
            header con botón de volver, y en móvil no hay espacio para dos cabeceras). Píldora
            oscura flotante separada de los bordes (antes era una barra cuadrada de borde a
            borde) — mismo criterio que el bottom nav de acá abajo: redondeada, con margen, blur
            MUY liviano, sin glassmorphism pesado. `env(safe-area-inset-top)` en el wrapper
            exterior (no en la píldora misma) para que nunca quede debajo del notch/reloj/status
            bar sin agrandar la altura visual de los botones. */}
        {!isChatRoom && (
          <div className="shrink-0 md:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
            <div className="mx-4 mb-2 mt-2 flex h-[68px] items-center gap-2 rounded-[22px] border border-[var(--color-border-soft)] bg-[var(--color-background)]/95 px-2.5 backdrop-blur-[6px]">
              <button
                onClick={() => setMobileNavOpen(true)}
                aria-label="Abrir menú"
                title="Menú"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] cursor-pointer"
              >
                <MenuIcon size={20} />
              </button>
              {isChatsList ? (
                <span className="min-w-0 flex-1 truncate font-display text-[22px] font-bold" style={{ letterSpacing: "-0.3px" }}>
                  Chats
                </span>
              ) : (
                <Link href="/" className="flex min-w-0 flex-1 items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/branding/menzo-logo.png" alt="Menzo" className="h-[34px] w-[34px] shrink-0 rounded-xl" />
                  <span className="min-w-0 truncate font-display text-[22px] font-bold" style={{ letterSpacing: "-0.3px" }}>
                    Menzo
                  </span>
                </Link>
              )}
              {isChatsList ? (
                <>
                  <Link
                    href="/search"
                    aria-label="Buscar"
                    title="Buscar"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                  >
                    <SearchIcon size={20} />
                  </Link>
                  <Link
                    href="/chat?compose=1"
                    aria-label="Nueva conversación"
                    title="Nueva conversación"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                  >
                    <PlusIcon size={20} />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/search"
                    aria-label="Buscar"
                    title="Buscar"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                  >
                    <SearchIcon size={20} />
                  </Link>
                  <Link
                    href="/notifications"
                    aria-label="Notificaciones"
                    title="Notificaciones"
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.06] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
                  >
                    <BellIcon size={20} />
                    {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[var(--color-orange)]" />}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}

        <main
          className={
            isChatRoom
              ? "flex min-h-0 flex-1 flex-col overflow-hidden"
              : "min-h-0 flex-1 overflow-y-auto pb-[calc(6.5rem+env(safe-area-inset-bottom))] md:pb-0"
          }
          onPointerDown={swipeNav.onPointerDown}
          onPointerUp={swipeNav.onPointerUp}
          onPointerCancel={swipeNav.onPointerCancel}
        >
          {children}
        </main>
      </div>
      </div>

      {/* Tab bar — solo móvil, oculta dentro del detalle de una sala: no hay lugar para header +
          mensajes + composer + teclado + tab bar a la vez, y la sala ya tiene su propio botón de
          volver. Reaparece al salir de la sala. Píldora flotante con margen (antes: barra
          cuadrada de borde a borde) — mismo criterio que el header de arriba. El botón "Crear"
          sobresale apenas por arriba de la píldora (nunca un círculo gigante de 100px) y el
          `paddingBottom` del wrapper exterior es el único lugar donde entra el safe-area
          inferior — nunca se suma adentro de la altura visual de los botones. */}
      {!isChatRoom && (
        <div
          className="fixed inset-x-0 bottom-0 z-20 px-3.5 md:hidden"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="relative mx-auto flex h-[68px] max-w-md items-center rounded-[24px] border border-[var(--color-border-soft)] bg-[var(--color-background)]/90 px-1.5 backdrop-blur-[8px]">
            {FALLBACK_NAV_ITEMS.slice(0, 2).map((item) => (
              <NavTabItem key={item.href} item={item} active={isActive(item.href)} accent={accent.color} liveRoomCount={liveRoomCount} />
            ))}
            <div className="w-[58px] shrink-0" aria-hidden />
            {FALLBACK_NAV_ITEMS.slice(2, 4).map((item) => (
              <NavTabItem key={item.href} item={item} active={isActive(item.href)} accent={accent.color} liveRoomCount={liveRoomCount} />
            ))}
            <Link
              href="/"
              aria-label="Crear"
              title="Crear"
              className="absolute left-1/2 top-0 flex h-[54px] w-[54px] -translate-x-1/2 -translate-y-[14px] items-center justify-center rounded-full text-black"
              style={{
                background: `linear-gradient(135deg, var(--color-orange), ${accent.color})`,
                border: "4px solid var(--color-background)",
                boxShadow: `0 0 14px 1px ${accent.color}33`,
              }}
            >
              <PlusIcon size={24} />
            </Link>
          </div>
        </div>
      )}

      {/* Drawer hamburguesa — solo mobile, mismo SidebarNavContent que el <aside> de escritorio
          (ver comentario ahí arriba). Desliza desde la izquierda, no desde abajo como Sheet —
          visualmente es "el sidebar", no un modal de acción puntual. */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} aria-hidden />
          <div
            className="menzo-fade-in relative flex h-full w-[84%] max-w-72 flex-col gap-1 overflow-y-auto px-3.5 py-4 shadow-[8px_0_32px_rgba(0,0,0,0.55)]"
            style={navStyle}
          >
            <button
              onClick={() => setMobileNavOpen(false)}
              aria-label="Cerrar menú"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white cursor-pointer"
            >
              <CloseIcon size={16} />
            </button>
            <SidebarNavContent
              communityTheme={communityTheme}
              communityNavSections={communityNavSections}
              liveRoomCount={liveRoomCount}
              isStaff={isStaff}
              profile={state.profile}
              accent={accent}
              isActive={isActive}
              onLogout={handleLogout}
              onNavigate={() => setMobileNavOpen(false)}
              activeCommunitySlug={activeCommunityDetail?.slug ?? null}
            />
          </div>
        </div>
      )}

      <PersistentVoiceBubble />
      <MenziDjPlayerHost />
      <MenziDjAutoplayBar />
    </div>
  );
}

/** Un ítem del tab bar flotante de mobile — indicador activo chico (barrita de 18px debajo del
 * ícono, no la barra ancha de 32px que había antes) y color de acento solo en lo estrictamente
 * activo, mismo criterio que _navItem en app_shell.dart (Flutter). */
function NavTabItem({
  item,
  active,
  accent,
  liveRoomCount,
}: {
  item: (typeof FALLBACK_NAV_ITEMS)[number];
  active: boolean;
  accent: string;
  liveRoomCount: number;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      style={{ color: active ? accent : undefined }}
      className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] transition-colors ${
        active ? "font-semibold" : "font-medium text-[var(--color-text-muted)]"
      }`}
    >
      <span className="relative">
        <Icon size={22} />
        {/* Mismo dato real que el badge de "Salas en vivo" del sidebar (liveRoomCount) — acá no
            hay un tab de "Salas en vivo" propio en mobile, así que el aviso vive en Chats (ahí es
            donde efectivamente se puede entrar a una). */}
        {item.href === "/chat" && liveRoomCount > 0 && (
          <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-[var(--color-coral)]" />
        )}
      </span>
      {item.label}
      <span
        className="h-[3px] rounded-full transition-[width] duration-200"
        style={{ width: active ? 18 : 0, background: accent }}
      />
    </Link>
  );
}

/** Contenido real del nav lateral — extraído para que el `<aside>` de escritorio y el drawer
 * hamburguesa de mobile (ver MobileNavDrawer más abajo) rendericen exactamente lo mismo, en vez
 * de mantener dos copias del mismo JSX. `onNavigate` es el único agregado real para el caso
 * mobile: cierra el drawer al tocar un link (en escritorio no hace falta, no hay nada que cerrar). */
function SidebarNavContent({
  communityTheme,
  communityNavSections,
  liveRoomCount,
  isStaff,
  profile,
  accent,
  isActive,
  onLogout,
  onNavigate,
  activeCommunitySlug,
}: {
  communityTheme: ResolvedCommunityTheme;
  communityNavSections: ({ key: CommunityNavigationSectionKey } & CommunityNavigationSectionConfig)[];
  liveRoomCount: number;
  isStaff: boolean;
  profile: UserProfile | null;
  accent: ReturnType<typeof useAccent>;
  isActive: (href: string) => boolean;
  onLogout: () => void;
  onNavigate?: () => void;
  /** Para el link de "Pizarra" — a diferencia del resto de MY_STUFF_ITEMS (rutas fijas), la
   * pizarra es por comunidad (`/communities/{slug}/whiteboard`), así que no puede vivir en ese
   * array estático. `null` = sin comunidad activa, no se muestra el link. */
  activeCommunitySlug: string | null;
}) {
  return (
    <>
      {/* "Luces" de los colores de la comunidad — dos glows difuminados y fijos (no siguen el
          scroll) detrás del contenido, con los colores reales del tema de esa comunidad en vez
          de un violeta fijo. Puramente decorativo (pointer-events-none), nunca compite con la
          legibilidad del texto por la opacidad baja + blur grande. */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -left-16 -top-20 h-64 w-64 rounded-full opacity-25 blur-[70px]"
          style={{ background: communityTheme.primaryColor }}
        />
        <div
          className="absolute -right-20 top-1/2 h-56 w-56 rounded-full opacity-[0.16] blur-[70px]"
          style={{ background: communityTheme.secondaryColor }}
        />
      </div>
      <div className="relative flex h-full flex-col gap-1">
        {/* community-mini del blueprint — orb + nombre + miembros/en línea, en una card propia
            con degradado sutil (antes era un botón suelto sin el marco de card). */}
        <div
          className="mb-3 rounded-2xl border p-3"
          style={{
            borderColor: `${communityTheme.primaryColor}2a`,
            background: `linear-gradient(180deg, ${communityTheme.primaryColor}14, rgba(255,255,255,0.015))`,
          }}
        >
          <CommunitySwitcher />
        </div>

        {/* Filas de 44px con estado activo en pill (fondo degradado + borde), no la barrita
            lateral de antes — mismo tratamiento que .nav a.active en web/styles.css. Badge de
            conteo solo donde hay un dato real (salas en vivo); no se inventa un contador de
            mensajes no leídos por sala, ese dato no existe en el backend todavía. */}
        <nav className="flex flex-col gap-1">
          {(communityNavSections.length > 0
            ? communityNavSections.map((section) => ({
                key: section.key,
                href: COMMUNITY_NAV_ROUTES[section.key]!,
                label: section.label,
                Icon: COMMUNITY_NAV_ICONS[section.key] ?? HomeIcon,
                badge: section.key === "live" ? liveRoomCount : undefined,
              }))
            : FALLBACK_NAV_ITEMS.map((item) => ({ key: item.href, href: item.href, label: item.label, Icon: item.icon, badge: undefined }))
          ).map(({ key, href, label, Icon, badge }) => {
            const active = isActive(href);
            return (
              <Link
                key={key}
                href={href}
                onClick={onNavigate}
                style={
                  active
                    ? { background: `linear-gradient(90deg, ${accent.color}3a, ${accent.color}12)`, borderColor: `${accent.color}2a` }
                    : undefined
                }
                className={`flex h-11 items-center gap-3 rounded-xl border border-transparent px-3 text-sm font-medium transition-all ${
                  active
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-muted)] hover:bg-white/[0.035] hover:text-[var(--color-text-primary)]"
                }`}
              >
                <span className="w-5 text-center" style={active ? { color: accent.color } : undefined}>
                  <Icon size={20} />
                </span>
                <span className="flex-1">{label}</span>
                {!!badge && (
                  <span className="rounded-full bg-[var(--color-coral)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--color-coral)]">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
          <Link
            href="/?tab=descubrir"
            onClick={onNavigate}
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--color-text-muted)] transition-all hover:bg-white/[0.035] hover:text-[var(--color-text-primary)]"
          >
            <span className="w-5 text-center">
              <CompassIcon size={20} />
            </span>
            Explorar
          </Link>
        </nav>

        <div className="mt-3 flex flex-col gap-1">
          <p className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-wide text-[var(--color-text-faint,#6f7b8c)]">Mis cosas</p>
          {MY_STUFF_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onNavigate}
                className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.035] hover:text-[var(--color-text-primary)]"
              >
                <span className="w-5 text-center">
                  <Icon size={18} />
                </span>
                {item.label}
              </Link>
            );
          })}
          {activeCommunitySlug && (
            <Link
              href={`/communities/${activeCommunitySlug}/whiteboard`}
              onClick={onNavigate}
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.035] hover:text-[var(--color-text-primary)]"
            >
              <span className="w-5 text-center">
                <PaletteIcon size={18} />
              </span>
              Pizarra
            </Link>
          )}
          {isStaff && (
            <Link
              href="/admin"
              onClick={onNavigate}
              className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.035] hover:text-[var(--color-text-primary)]"
            >
              <span className="w-5 text-center">
                <CrownIcon size={18} />
              </span>
              Admin
            </Link>
          )}
        </div>

        {/* Sin "Crear publicación" acá abajo — ese CTA ya vive una sola vez en el "+ Crear" de
            la topbar (sección de arriba), el blueprint tampoco lo duplica en la sidebar. */}
        <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border-soft)] pt-3.5">
          <Link
            href="/settings"
            onClick={onNavigate}
            className="flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.035] hover:text-[var(--color-text-primary)]"
          >
            <span className="w-5 text-center">
              <SettingsIcon size={18} />
            </span>
            Configuración
          </Link>
          {profile && (
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-white/[0.025] py-2.5 pl-2.5 pr-1.5">
              <Link href="/profile" onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar
                  name={profile.displayName}
                  avatarUri={profile.avatarUri}
                  gradient={profile.avatarGradient}
                  size={34}
                  showOnline
                  online
                  level={profile.level}
                />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-xs font-semibold">{profile.displayName}</span>
                  <span className="text-[10px] text-[var(--color-text-muted)]">Nivel {profile.level}</span>
                </span>
              </Link>
              <button
                onClick={onLogout}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-white/[0.06] hover:text-[var(--color-coral)] cursor-pointer"
              >
                <LogoutIcon size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
