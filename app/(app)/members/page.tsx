"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { CommunityHero } from "@/components/CommunityHero";
import { ContextSidebar, ContextSidebarSection } from "@/components/ContextSidebar";
import { SearchIcon } from "@/components/icons";
import { MenziIllustrationState } from "@/components/illustrations/MenziIllustrationState";
import { communitiesApi } from "@/lib/api";
import { toGradient } from "@/lib/api/mappers";
import type { CommunityMemberDto } from "@/lib/api/types";
import { useCommunity } from "@/lib/communities/CommunityContext";

const PAGE_SIZE = 30;

const ROLE_LABEL: Record<string, string> = {
  COMMUNITY_OWNER: "Líder",
  COMMUNITY_ADMIN: "Líder",
  COMMUNITY_MODERATOR: "Moderador",
  COMMUNITY_CURATOR: "Curador",
  MEMBER: "Miembro",
};

const LEADER_ROLES = new Set(["COMMUNITY_OWNER", "COMMUNITY_ADMIN"]);
const MOD_ROLES = new Set(["COMMUNITY_MODERATOR", "COMMUNITY_CURATOR"]);

type MemberFilter = "todos" | "conectados" | "lideres" | "moderadores";

function MemberRow({ member }: { member: CommunityMemberDto }) {
  return (
    <Link
      href={`/member/${member.user.id}`}
      className="menzo-panel flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--color-border-strong)]"
    >
      <Avatar
        name={member.user.displayName}
        avatarUri={member.user.avatarUri ?? undefined}
        gradient={toGradient(member.user.avatarGradient)}
        size={48}
        showOnline
        online={member.user.isOnline}
      />
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 truncate text-sm font-medium">
          <span className="truncate">{member.customTitle || member.user.displayName}</span>
          <span className="shrink-0 rounded-full bg-[var(--color-surface-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-cyan)]">
            {ROLE_LABEL[member.communityRole] ?? member.communityRole}
          </span>
        </p>
        <p className="truncate text-xs text-[var(--color-text-muted)]">@{member.user.username}</p>
      </div>
    </Link>
  );
}

/** Miembros de la comunidad ACTIVA (con su rol real) — antes esta pantalla mostraba una búsqueda
 * global de usuarios de toda la plataforma, sin relación con ninguna comunidad puntual. Usa
 * GET /api/communities/{id}/members (ver CommunitiesService.listMembers en menzoapi), que no
 * existía hasta esta fase. */
export default function MembersPage() {
  const router = useRouter();
  const { activeCommunity } = useCommunity();
  const [members, setMembers] = useState<CommunityMemberDto[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("todos");
  // "Ajustar estado durante el render" en vez de un setState síncrono al abrir el effect de abajo
  // (mismo patrón que lib/chat/useChatAppearance.ts) — evita el render extra que dispararía un
  // useEffect con un setState(true) como primera línea.
  const loading = !!activeCommunity && activeCommunity.id !== loadedFor;

  useEffect(() => {
    // Sin comunidad activa no hace falta resetear nada acá: el render de más abajo devuelve un
    // estado vacío dedicado sin leer `members`/`loading` en absoluto.
    if (!activeCommunity || activeCommunity.id === loadedFor) return;
    let cancelled = false;
    communitiesApi
      .members(activeCommunity.id, 0, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        setMembers(res.items);
        setPage(0);
        setHasNext(res.hasNext);
        setLoadedFor(activeCommunity.id);
      })
      .catch((error) => {
        console.warn("[menzo/web] load community members failed", error);
        if (!cancelled) setLoadedFor(activeCommunity.id);
      });
    return () => {
      cancelled = true;
    };
  }, [activeCommunity, loadedFor]);

  async function loadMore() {
    if (loadingMore || !hasNext || !activeCommunity) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await communitiesApi.members(activeCommunity.id, nextPage, PAGE_SIZE);
      setMembers((current) => {
        const map = new Map(current.map((m) => [m.user.id, m]));
        for (const m of res.items) map.set(m.user.id, m);
        return Array.from(map.values());
      });
      setPage(nextPage);
      setHasNext(res.hasNext);
    } catch (error) {
      console.warn("[menzo/web] load more community members failed", error);
    } finally {
      setLoadingMore(false);
    }
  }

  const leaders = members.filter((m) => LEADER_ROLES.has(m.communityRole));
  const mods = members.filter((m) => MOD_ROLES.has(m.communityRole));
  const onlineMembers = members.filter((m) => m.user.isOnline);
  const online = onlineMembers.length;

  // Búsqueda y filtro son client-side sobre lo ya cargado (mismo criterio que "Cargar más" de
  // abajo) — communitiesApi.members no tiene un parámetro de búsqueda propio, así que no hay forma
  // de pedirle al backend "buscar en toda la comunidad" sin inventar un endpoint nuevo.
  const filteredMembers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (filter === "conectados" && !m.user.isOnline) return false;
      if (filter === "lideres" && !LEADER_ROLES.has(m.communityRole)) return false;
      if (filter === "moderadores" && !MOD_ROLES.has(m.communityRole)) return false;
      if (!q) return true;
      return (
        m.user.displayName.toLowerCase().includes(q) ||
        m.user.username.toLowerCase().includes(q) ||
        (m.customTitle ?? "").toLowerCase().includes(q)
      );
    });
  }, [members, query, filter]);

  if (!activeCommunity) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
        <MenziIllustrationState
          image="/illustrations/menzi/menzi-friends.webp"
          alt="Menzi rodeado de otras criaturas y corazones"
          title="Elegí una comunidad"
          description="Los miembros que ves acá pertenecen a tu comunidad activa — unite a una para verlos."
          size="medium"
          action={{ label: "Explorar comunidades", onClick: () => router.push("/communities") }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full w-full flex-col gap-6 px-4 py-6 md:px-8 lg:flex-row lg:items-start lg:gap-6">
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:mx-0 lg:max-w-[720px] lg:flex-1">
      <CommunityHero />

      <div className="flex flex-col gap-1">
        <h1 className="font-display text-xl font-bold">Miembros de {activeCommunity.name}</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          {members.length.toLocaleString("es-ES")} miembros en total · {online} conectados
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3.5 py-2.5">
          <SearchIcon size={16} className="shrink-0 text-[var(--color-text-muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar miembros…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "todos", label: `Todos ${members.length}` },
              { value: "conectados", label: `Conectados ${online}` },
              { value: "lideres", label: `Líderes ${leaders.length}` },
              { value: "moderadores", label: `Moderadores ${mods.length}` },
            ] as { value: MemberFilter; label: string }[]
          ).map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap cursor-pointer ${
                filter === option.value
                  ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]"
                  : "border border-[var(--color-border-soft)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {onlineMembers.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Conectados ahora</h2>
          <div className="flex gap-3 overflow-x-auto pb-1" data-no-swipe-nav>
            {onlineMembers.slice(0, 16).map((member) => (
              <Link
                key={member.user.id}
                href={`/member/${member.user.id}`}
                className="flex shrink-0 flex-col items-center gap-1.5"
                title={member.user.displayName}
              >
                <Avatar
                  name={member.user.displayName}
                  avatarUri={member.user.avatarUri ?? undefined}
                  gradient={toGradient(member.user.avatarGradient)}
                  size={52}
                  showOnline
                  online
                />
                <span className="max-w-[64px] truncate text-[11px] text-[var(--color-text-secondary)]">{member.user.displayName}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Cargando miembros…</p>
      ) : members.length === 0 ? (
        <MenziIllustrationState
          image="/illustrations/menzi/menzi-friends.webp"
          alt="Menzi rodeado de otras criaturas y corazones"
          title="Todavía no hay miembros"
          description="Cuando alguien se una a esta comunidad, va a aparecer acá."
          size="medium"
        />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {filteredMembers.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Nadie coincide con esa búsqueda.</p>
            ) : (
              filteredMembers.map((m) => <MemberRow key={m.user.id} member={m} />)
            )}
          </div>

          {hasNext && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="self-center rounded-full border border-[var(--color-border-soft)] px-5 py-2 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] disabled:opacity-50 cursor-pointer"
            >
              {loadingMore ? "Cargando…" : "Cargar más"}
            </button>
          )}
        </>
      )}
    </div>

    <ContextSidebar>
      <div className="menzo-panel grid grid-cols-3 gap-2 p-4 text-center">
        <div>
          <p className="text-lg font-bold">{members.length}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">Miembros</p>
        </div>
        <div>
          <p className="text-lg font-bold">{leaders.length}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">Líderes</p>
        </div>
        <div>
          <p className="text-lg font-bold">{mods.length}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">Mods</p>
        </div>
      </div>

      <ContextSidebarSection title="Líderes">
        {leaders.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">Sin líderes todavía.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {leaders.map((m) => (
              <Link key={m.user.id} href={`/member/${m.user.id}`} className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-[var(--color-surface-secondary)]">
                <Avatar name={m.user.displayName} avatarUri={m.user.avatarUri ?? undefined} gradient={toGradient(m.user.avatarGradient)} size={32} showOnline online={m.user.isOnline} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.user.displayName}</span>
              </Link>
            ))}
          </div>
        )}
      </ContextSidebarSection>

      <ContextSidebarSection title={`Moderadores (${mods.length})`}>
        {mods.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">Sin moderadores todavía.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {mods.slice(0, 6).map((m) => (
              <Link key={m.user.id} href={`/member/${m.user.id}`} className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-[var(--color-surface-secondary)]">
                <Avatar name={m.user.displayName} avatarUri={m.user.avatarUri ?? undefined} gradient={toGradient(m.user.avatarGradient)} size={32} showOnline online={m.user.isOnline} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.user.displayName}</span>
              </Link>
            ))}
          </div>
        )}
      </ContextSidebarSection>
    </ContextSidebar>
    </div>
  );
}
