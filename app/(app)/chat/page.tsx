"use client";

import Link from "next/link";
import { useState } from "react";

import { GradientButton } from "@/components/GradientButton";
import { gradientCss } from "@/lib/theme";
import { useAppState } from "@/lib/AppStateContext";

export default function ChatListPage() {
  const { state, actions } = useAppState();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const rooms = state.social.rooms;

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

      <div className="flex flex-col gap-2">
        {rooms.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Tus próximas historias comienzan aquí.</p>
        ) : (
          rooms.map((room) => (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className="flex items-center gap-4 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 hover:bg-[var(--color-surface-secondary)]"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white font-semibold"
                style={{ background: gradientCss(room.gradient) }}
              >
                {(room.peer?.displayName ?? room.name).charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{room.peer?.displayName ?? room.name}</span>
                <span className="block truncate text-sm text-[var(--color-text-muted)]">
                  {room.type === "direct" ? (room.peer?.isOnline ? "En línea" : "Desconectado") : `${room.onlineCount} conectados`}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
