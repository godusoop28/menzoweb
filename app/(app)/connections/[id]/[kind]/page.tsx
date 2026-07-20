"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BackIcon } from "@/components/icons";
import { MemberCard } from "@/components/MemberCard";
import { getMyRealId, mapDemoUser, usersApi } from "@/lib/api";
import type { UserProfileDto } from "@/lib/api/types";
import type { DemoUser } from "@/lib/types";

export default function ConnectionsPage() {
  const { id, kind } = useParams<{ id: string; kind: string }>();
  const router = useRouter();
  const [users, setUsers] = useState<DemoUser[] | null>(null);

  const isFollowers = kind === "followers";

  useEffect(() => {
    if (!id) return;
    const call = isFollowers ? usersApi.followers(id) : usersApi.following(id);
    call
      .then((dtos: UserProfileDto[]) => {
        const myRealId = getMyRealId();
        setUsers(dtos.map((dto) => mapDemoUser(dto, myRealId)));
      })
      .catch((error) => {
        console.warn("[menzo/web] load connections failed", error);
        setUsers([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, kind]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="cursor-pointer text-[var(--color-text-secondary)]" aria-label="Volver">
          <BackIcon size={20} />
        </button>
        <h1 className="font-display text-xl font-bold">{isFollowers ? "Seguidores" : "Siguiendo"}</h1>
      </div>

      {users === null ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Cargando…</p>
      ) : users.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
          {isFollowers ? "Todavía no tiene seguidores." : "Todavía no sigue a nadie."}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => (
            <MemberCard key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}
