"use client";

import { useState } from "react";

import { ChatRoomListItem } from "@/components/ChatRoomListItem";
import { GradientButton } from "@/components/GradientButton";
import { MenziIllustrationState } from "@/components/illustrations/MenziIllustrationState";
import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { useCommunity } from "@/lib/communities/CommunityContext";

export default function ChatListPage() {
  const { state, actions } = useAppState();
  const accent = useAccent();
  const { activeCommunityDetail } = useCommunity();
  const chatBackgroundUrl = activeCommunityDetail?.themeConfig?.chatBackgroundUrl || activeCommunityDetail?.backgroundUrl;
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const myRooms = state.social.rooms.filter((r) => r.type === "direct" || r.joined);
  const favoriteRooms = myRooms.filter((r) => r.favorite);
  const directRooms = myRooms.filter((r) => !r.favorite && r.type === "direct");
  const publicRooms = myRooms.filter((r) => !r.favorite && r.type === "public");

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
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8"
      style={
        chatBackgroundUrl
          ? {
              backgroundImage: `linear-gradient(rgba(7,9,13,0.88), rgba(7,9,13,0.88)), url(${chatBackgroundUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "top center",
              backgroundAttachment: "fixed",
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Mis chats</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          style={{ background: accent.color }}
          className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--color-text-on-accent)] cursor-pointer"
        >
          + Crear sala
        </button>
      </div>

      {showCreate && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la sala"
            className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-orange)]"
          />
          <GradientButton label="Crear" onClick={handleCreate} disabled={!name.trim()} loading={creating} size="md" />
        </div>
      )}

      {myRooms.length === 0 && (
        <MenziIllustrationState
          image="/illustrations/menzi/menzi-chat.webp"
          alt=""
          title="Todavía no hay chats"
          description="Únete a una sala pública o inicia una conversación directa para empezar."
          size="medium"
          priority
        />
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

      {directRooms.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Mensajes directos</h2>
          <div className="flex flex-col gap-2">
            {directRooms.map((room) => (
              <ChatRoomListItem key={room.id} room={room} />
            ))}
          </div>
        </div>
      )}

      {myRooms.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Salas públicas</h2>
          {publicRooms.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Tus próximas historias comienzan aquí.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {publicRooms.map((room) => (
                <ChatRoomListItem key={room.id} room={room} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
