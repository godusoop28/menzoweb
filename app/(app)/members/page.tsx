"use client";

import { useEffect, useState } from "react";

import { MemberCard } from "@/components/MemberCard";
import { getMyRealId, mapDemoUser, usersApi } from "@/lib/api";
import type { UserProfileDto } from "@/lib/api/types";
import type { DemoUser } from "@/lib/types";

const PAGE_SIZE = 30;

export default function MembersPage() {
  const [members, setMembers] = useState<DemoUser[]>([]);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    usersApi
      .search("", 0, PAGE_SIZE)
      .then((res) => {
        if (cancelled) return;
        const myRealId = getMyRealId();
        setMembers(res.items.map((dto: UserProfileDto) => mapDemoUser(dto, myRealId)));
        setPage(0);
        setHasNext(res.hasNext);
      })
      .catch((error) => console.warn("[menzo/web] load members failed", error))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadMore() {
    if (loadingMore || !hasNext) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await usersApi.search("", nextPage, PAGE_SIZE);
      const myRealId = getMyRealId();
      setMembers((current) => {
        const map = new Map(current.map((u) => [u.id, u]));
        for (const dto of res.items) map.set(dto.id, mapDemoUser(dto, myRealId));
        return Array.from(map.values());
      });
      setPage(nextPage);
      setHasNext(res.hasNext);
    } catch (error) {
      console.warn("[menzo/web] load more members failed", error);
    } finally {
      setLoadingMore(false);
    }
  }

  const online = members.filter((u) => u.isOnline);
  const offline = members.filter((u) => !u.isOnline);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="menzo-fade-in relative overflow-hidden rounded-3xl shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/banners/banner-connections.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[rgba(7,9,13,0.35)]" />
        <div className="relative flex flex-col gap-1.5 p-6 text-white">
          <h1 className="font-display text-2xl font-bold">Ahora mismo</h1>
          <p className="text-white/85">Estas personas mantienen encendida la comunidad.</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--color-online)]" />
            <span className="text-sm font-medium">{online.length} conectados</span>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Cargando miembros…</p>
      ) : members.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no hay miembros para mostrar.</p>
      ) : (
        <>
          {online.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Conectados</h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {online.map((user) => (
                  <MemberCard key={user.id} user={user} variant="column" />
                ))}
              </div>
            </div>
          )}

          {offline.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Todos los miembros</h2>
              <div className="flex flex-col gap-2">
                {offline.map((user) => (
                  <MemberCard key={user.id} user={user} />
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
  );
}
