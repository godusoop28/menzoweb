"use client";

import { useState } from "react";

import { ChatRoomListItem } from "@/components/ChatRoomListItem";
import { GradientButton } from "@/components/GradientButton";
import { useAppState } from "@/lib/AppStateContext";

export default function ChatListPage() {
  const { state, actions } = useAppState();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const favoriteRooms = state.social.rooms.filter((r) => r.favorite);
  const otherRooms = state.social.rooms.filter((r) => !r.favorite);

  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    try {
      const roomId = await actions.createRoom({ name: trimmed });
      if (roomId) {
        setShowCreate(false);
        setName("");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Mis chats</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium cursor-pointer"
        >
          Crear sala
        </button>
      </div>

      {showCreate && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la sala"
            className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 outline-none"
          />
          <GradientButton label="Crear" onClick={handleCreate} disabled={!name.trim()} loading={creating} size="md" />
        </div>
      )}

      {favoriteRooms.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Favoritos</h2>
          <div className="flex flex-col gap-2">
            {favoriteRooms.map((room) => (
              <ChatRoomListItem key={room.id} room={room} />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Salas</h2>
        {otherRooms.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Tus próximas historias comienzan aquí.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {otherRooms.map((room) => (
              <ChatRoomListItem key={room.id} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
