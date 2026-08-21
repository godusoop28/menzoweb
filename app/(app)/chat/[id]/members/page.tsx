"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { BackIcon, SearchIcon } from "@/components/icons";
import { ApiError, chatApi, getMyRealId, mapDemoUser, mapUserSummary, usersApi } from "@/lib/api";
import type { BanDto, RoomMemberDto } from "@/lib/api/types";
import { useAppState } from "@/lib/AppStateContext";
import { findRoom } from "@/lib/store/selectors";
import { useToast } from "@/lib/ToastContext";
import type { ChatRoomRole, DemoUser } from "@/lib/types";

type MemberRow = { user: DemoUser; role: ChatRoomRole; joinedAt: string };
type BanRow = { user: DemoUser; reason: string | null; createdAt: string };

const ROLE_LABEL: Record<ChatRoomRole, string> = { owner: "👑 Anfitrión", co_host: "⭐ Coanfitrión", member: "Miembro" };

export default function RoomMembersPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state } = useAppState();
  const showToast = useToast();
  const room = findRoom(state.social, id);
  const myRole = room?.role ?? null;
  const canModerate = myRole === "owner" || myRole === "co_host";

  const [members, setMembers] = useState<MemberRow[] | null>(null);
  const [bans, setBans] = useState<BanRow[] | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteResults, setInviteResults] = useState<DemoUser[]>([]);
  const [inviting, setInviting] = useState(false);

  const myRealId = getMyRealId();

  const loadMembers = useCallback(() => {
    if (!id) return;
    chatApi
      .members(id)
      .then((dtos: RoomMemberDto[]) =>
        setMembers(
          dtos.map((dto) => ({
            user: mapUserSummary(dto.user, myRealId),
            role: dto.role.toLowerCase() as ChatRoomRole,
            joinedAt: dto.joinedAt,
          }))
        )
      )
      .catch((error) => {
        console.warn("[menzo/web] load members failed", error);
        setMembers([]);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadBans = useCallback(() => {
    if (!id || !canModerate) return;
    chatApi
      .bans(id)
      .then((dtos: BanDto[]) =>
        setBans(dtos.map((dto) => ({ user: mapUserSummary(dto.user, myRealId), reason: dto.reason, createdAt: dto.createdAt })))
      )
      .catch(() => setBans([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, canModerate]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadBans();
  }, [loadBans]);

  async function runAction(action: () => Promise<void>, userId: string, refresh: () => void = loadMembers) {
    setBusyUserId(userId);
    try {
      await action();
      refresh();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No se pudo completar la acción.");
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleSearch() {
    const query = inviteQuery.trim();
    if (!query || !id) return;
    try {
      const page = await usersApi.search(query, 0, 10);
      setInviteResults(page.items.map((dto) => mapDemoUser(dto, myRealId)));
    } catch (error) {
      console.warn("[menzo/web] user search failed", error);
    }
  }

  async function handleInvite(userId: string) {
    if (!id) return;
    setInviting(true);
    try {
      await chatApi.invite(id, userId);
      setInviteResults((prev) => prev.filter((u) => u.id !== userId));
      loadMembers();
      showToast("Se agregó a la sala.");
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No se pudo invitar a este usuario.");
    } finally {
      setInviting(false);
    }
  }

  if (!room) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">No encontramos esta conversación.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="cursor-pointer text-[var(--color-text-secondary)]" aria-label="Volver">
          <BackIcon size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold">Miembros</h1>
          <p className="text-xs text-[var(--color-text-muted)]">{room.name}</p>
        </div>
      </div>

      {canModerate && (
        <div className="menzo-panel flex flex-col gap-2 p-4">
          <p className="text-sm font-semibold">Invitar personas</p>
          <div className="flex gap-2">
            <input
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar por nombre o usuario…"
              className="flex-1 rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)]"
            />
            <button
              onClick={handleSearch}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] cursor-pointer"
              aria-label="Buscar"
            >
              <SearchIcon size={16} />
            </button>
          </div>
          {inviteResults.length > 0 && (
            <div className="flex flex-col gap-2 pt-1">
              {inviteResults.map((user) => (
                <div key={user.id} className="flex items-center gap-2.5">
                  <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={32} />
                  <p className="flex-1 truncate text-sm">{user.displayName}</p>
                  <button
                    onClick={() => handleInvite(user.id)}
                    disabled={inviting}
                    style={{ background: "var(--color-cyan)" }}
                    className="rounded-full px-3 py-1 text-xs font-semibold text-black disabled:opacity-60 cursor-pointer"
                  >
                    Invitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        {members === null ? (
          <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">Cargando…</p>
        ) : (
          members.map((member) => {
            const isSelf = member.user.id === myRealId;
            const canAct = canModerate && !isSelf && !(myRole === "co_host" && member.role !== "member");
            const canPromoteOrDemote = myRole === "owner" && !isSelf && member.role !== "owner";
            const busy = busyUserId === member.user.id;
            return (
              <div
                key={member.user.id}
                className="menzo-panel flex items-center gap-3 p-3"
              >
                <Avatar name={member.user.displayName} avatarUri={member.user.avatarUri} gradient={member.user.avatarGradient} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{member.user.displayName}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{ROLE_LABEL[member.role]}</p>
                </div>
                {(canPromoteOrDemote || canAct) && (
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {canPromoteOrDemote && member.role === "member" && (
                      <button
                        disabled={busy}
                        onClick={() => runAction(() => chatApi.promote(id, member.user.id), member.user.id)}
                        className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60 cursor-pointer"
                      >
                        Hacer coanfitrión
                      </button>
                    )}
                    {canPromoteOrDemote && member.role === "co_host" && (
                      <button
                        disabled={busy}
                        onClick={() => runAction(() => chatApi.demote(id, member.user.id), member.user.id)}
                        className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60 cursor-pointer"
                      >
                        Quitar coanfitrión
                      </button>
                    )}
                    {canAct && (
                      <>
                        <button
                          disabled={busy}
                          onClick={() => runAction(() => chatApi.kick(id, member.user.id), member.user.id)}
                          className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60 cursor-pointer"
                        >
                          Expulsar
                        </button>
                        <button
                          disabled={busy}
                          onClick={() =>
                            runAction(() => chatApi.ban(id, member.user.id), member.user.id, () => {
                              loadMembers();
                              loadBans();
                            })
                          }
                          className="rounded-full bg-[var(--color-coral)]/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-coral)] disabled:opacity-60 cursor-pointer"
                        >
                          Banear
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {canModerate && bans !== null && bans.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold text-[var(--color-text-muted)]">Baneados</p>
          {bans.map((ban) => (
            <div
              key={ban.user.id}
              className="menzo-panel flex items-center gap-3 p-3"
            >
              <Avatar name={ban.user.displayName} avatarUri={ban.user.avatarUri} gradient={ban.user.avatarGradient} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{ban.user.displayName}</p>
                {!!ban.reason && <p className="truncate text-xs text-[var(--color-text-muted)]">{ban.reason}</p>}
              </div>
              <button
                disabled={busyUserId === ban.user.id}
                onClick={() => runAction(() => chatApi.unban(id, ban.user.id), ban.user.id, loadBans)}
                className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60 cursor-pointer"
              >
                Desbanear
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
