"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ChatRoomListItem } from "@/components/ChatRoomListItem";
import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";

type RoomSort = "recent" | "popular";

/** Directorio de todas las salas públicas (unidas o no), como entrada de primer nivel en la nav —
 * reutiliza exactamente el mismo fetch/acción que la pestaña "Descubrir" del inicio
 * (actions.loadDiscoverRooms), esa pestaña sigue existiendo tal cual, esto es un acceso adicional. */
export default function PublicChatsPage() {
  const { state, actions } = useAppState();
  const accent = useAccent();
  const [roomSort, setRoomSort] = useState<RoomSort>("recent");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    actions.loadDiscoverRooms(roomSort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomSort]);

  const rooms = useMemo(() => {
    const publicRooms = state.social.rooms.filter((r) => r.type === "public");
    return [...publicRooms].sort((a, b) => {
      if (roomSort === "popular") return b.onlineCount - a.onlineCount;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [state.social.rooms, roomSort]);

  const liveRooms = rooms.filter((r) => r.live);

  async function handleJoin(roomId: string) {
    setJoiningId(roomId);
    try {
      await actions.joinRoom(roomId);
    } finally {
      setJoiningId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Chats públicos</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Explora todas las salas públicas y únete a las que te llamen la atención.</p>
        </div>
        <Link
          href="/chat"
          style={{ background: accent.color }}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap text-[var(--color-text-on-accent)]"
        >
          + Crear sala
        </Link>
      </div>

      {liveRooms.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--color-coral)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-coral)]" />
            En vivo ahora
          </p>
          {liveRooms.map((room) => (
            <ChatRoomListItem key={room.id} room={room} onJoin={handleJoin} joining={joiningId === room.id} />
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setRoomSort("recent")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium cursor-pointer ${
            roomSort === "recent" ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
          }`}
        >
          Recientes
        </button>
        <button
          onClick={() => setRoomSort("popular")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium cursor-pointer ${
            roomSort === "popular" ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
          }`}
        >
          Populares
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {rooms.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">No hay salas activas. Enciende la primera.</p>
        ) : (
          rooms.map((room) => <ChatRoomListItem key={room.id} room={room} onJoin={handleJoin} joining={joiningId === room.id} />)
        )}
      </div>
    </div>
  );
}
