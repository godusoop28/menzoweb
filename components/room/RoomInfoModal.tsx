"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { Sheet } from "@/components/ui/Sheet";
import { ApiError, chatApi, getMyRealId, mapRoomMember } from "@/lib/api";
import { useToast } from "@/lib/ToastContext";
import type { ChatRoom, ChatRoomRole, DemoUser } from "@/lib/types";

const ROLE_LABEL: Record<ChatRoomRole, string> = { owner: "Anfitrión", co_host: "Coanfitrión", member: "Miembro" };

/** Panel informativo accesible para cualquier miembro — distinto del panel administrativo
 * (RoomSettingsPanel): no tiene acciones de moderación, solo datos de la sala y "salir"/"reportar". */
export function RoomInfoModal({ room, onClose }: { room: ChatRoom; onClose: () => void }) {
  const router = useRouter();
  const showToast = useToast();
  const [owner, setOwner] = useState<DemoUser | null>(null);
  const [coHosts, setCoHosts] = useState<DemoUser[]>([]);
  const myRealId = getMyRealId();

  useEffect(() => {
    chatApi
      .members(room.id)
      .then((dtos) => {
        const mapped = dtos.map((dto) => mapRoomMember(dto, myRealId));
        setOwner(mapped.find((m) => m.role === "owner")?.user ?? null);
        setCoHosts(mapped.filter((m) => m.role === "co_host").map((m) => m.user));
      })
      .catch(() => {});
  }, [room.id, myRealId]);

  async function handleLeave() {
    try {
      await chatApi.leave(room.id);
      onClose();
      router.push("/chat");
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos salir de la sala.");
    }
  }

  return (
    <Sheet open onClose={onClose} title="Información de la sala" widthClassName="max-w-md">
      <div className="flex flex-col gap-4">
        {room.coverUri && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={room.coverUri} alt="" className="h-32 w-full rounded-2xl object-cover" />
        )}
        <div className="flex items-center gap-3">
          <Avatar name={room.name} avatarUri={room.avatarUri} gradient={room.gradient} size={56} />
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{room.name}</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              {room.type === "public" ? "Pública" : "Directa"} · {room.category || "Sin categoría"}
            </p>
          </div>
        </div>
        {room.description && <p className="text-sm text-[var(--color-text-secondary)]">{room.description}</p>}
        {room.live && room.liveSummary && (
          <div className="rounded-xl bg-[var(--color-coral)]/10 p-3 text-sm text-[var(--color-coral)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--color-coral)]" aria-hidden />
              LIVE ahora · {room.liveSummary.participantCount} personas
            </span>
            {room.liveSummary.announcement && <p className="mt-1 text-xs">{room.liveSummary.announcement}</p>}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <InfoStat label="Miembros" value={room.memberIds.length.toString()} />
          <InfoStat label="Conectados" value={room.onlineCount.toString()} />
        </div>
        {owner && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-[var(--color-text-muted)]">Anfitrión</p>
            <PersonRow user={owner} label={ROLE_LABEL.owner} />
          </div>
        )}
        {coHosts.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-[var(--color-text-muted)]">Coanfitriones</p>
            <div className="flex flex-col gap-1.5">
              {coHosts.map((u) => (
                <PersonRow key={u.id} user={u} label={ROLE_LABEL.co_host} />
              ))}
            </div>
          </div>
        )}
        <p className="text-xs text-[var(--color-text-muted)]">
          Creada el {new Date(room.createdAt).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-2 pt-2">
          {room.joined && room.role !== "owner" && (
            <button onClick={handleLeave} className="flex-1 rounded-full bg-[var(--color-surface-secondary)] py-2 text-sm font-semibold cursor-pointer">
              Salir de la sala
            </button>
          )}
          <button
            onClick={() => showToast("Gracias, revisaremos esta sala.")}
            className="flex-1 rounded-full bg-[var(--color-coral)]/15 py-2 text-sm font-semibold text-[var(--color-coral)] cursor-pointer"
          >
            Reportar
          </button>
        </div>
      </div>
    </Sheet>
  );
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-center">
      <p className="text-base font-bold">{value}</p>
      <p className="text-[11px] text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

function PersonRow({ user, label }: { user: DemoUser; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-[var(--color-surface-secondary)] p-2">
      <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={30} />
      <p className="min-w-0 flex-1 truncate text-sm">{user.displayName}</p>
      <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}
