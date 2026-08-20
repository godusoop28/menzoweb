"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
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

function MemberRow({ member }: { member: CommunityMemberDto }) {
  return (
    <Link
      href={`/member/${member.user.id}`}
      className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.4)] transition-all hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-secondary)]"
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
  const rest = members.filter((m) => !LEADER_ROLES.has(m.communityRole) && !MOD_ROLES.has(m.communityRole));
  const onlineMembers = members.filter((m) => m.user.isOnline);
  const online = onlineMembers.length;

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
      <div className="menzo-fade-in relative overflow-hidden rounded-3xl shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/banners/banner-connections.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[rgba(7,9,13,0.35)]" />
        <div className="relative flex flex-col gap-1.5 p-6 text-white">
          <h1 className="font-display text-2xl font-bold">Miembros de {activeCommunity.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-online)]" />
            <span className="text-sm font-medium">{online} conectados</span>
          </div>
        </div>
      </div>

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
          {leaders.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Líderes</h2>
              <div className="flex flex-col gap-2">
                {leaders.map((m) => (
                  <MemberRow key={m.user.id} member={m} />
                ))}
              </div>
            </div>
          )}

          {mods.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Moderadores</h2>
              <div className="flex flex-col gap-2">
                {mods.map((m) => (
                  <MemberRow key={m.user.id} member={m} />
                ))}
              </div>
            </div>
          )}

          {rest.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Todos los miembros</h2>
              <div className="flex flex-col gap-2">
                {rest.map((m) => (
                  <MemberRow key={m.user.id} member={m} />
                ))}
              </div>
            </div>
          )}

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

    <aside className="hidden lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:gap-4">
      <div className="grid grid-cols-3 gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-center">
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

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
        <h3 className="font-display text-sm font-bold">Conectados ahora ({online})</h3>
        {onlineMembers.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">Nadie en línea todavía.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {onlineMembers.slice(0, 16).map((member) => (
              <Link key={member.user.id} href={`/member/${member.user.id}`} title={member.user.displayName}>
                <Avatar
                  name={member.user.displayName}
                  avatarUri={member.user.avatarUri ?? undefined}
                  gradient={toGradient(member.user.avatarGradient)}
                  size={36}
                  showOnline
                  online
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </aside>
    </div>
  );
}
