"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { ChatRoomListItem } from "@/components/ChatRoomListItem";
import { CompassIcon, UsersIcon } from "@/components/icons";
import { GradientButton } from "@/components/GradientButton";
import { MenziIllustrationState } from "@/components/illustrations/MenziIllustrationState";
import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { communityFallbackGradient } from "@/lib/communities/backgroundStyle";
import { useCommunity } from "@/lib/communities/CommunityContext";

export default function ChatListPage() {
  const { state, actions } = useAppState();
  const accent = useAccent();
  const { activeCommunity, activeCommunityDetail } = useCommunity();
  const chatBackgroundUrl = activeCommunityDetail?.themeConfig?.chatBackgroundUrl || activeCommunityDetail?.backgroundUrl;
  const chatFallbackGradient = communityFallbackGradient(activeCommunity);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const allMyRooms = state.social.rooms.filter((r) => r.type === "direct" || r.joined);
  const myRooms = onlyFavorites ? allMyRooms.filter((r) => r.favorite) : allMyRooms;
  const favoriteRooms = myRooms.filter((r) => r.favorite);
  const directRooms = myRooms.filter((r) => !r.favorite && r.type === "direct");
  const publicRooms = myRooms.filter((r) => !r.favorite && r.type === "public");
  // Panel derecho (lg:+): contactos en línea entre mis conversaciones directas — dato real, no
  // existe un concepto de "amigos" separado de un chat directo ya iniciado.
  const onlineDirectRooms = allMyRooms.filter((r) => r.type === "direct" && r.peer?.isOnline).slice(0, 10);

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
    <div className="flex min-h-full w-full flex-col gap-6 px-4 py-6 md:px-8 lg:flex-row lg:items-start lg:gap-6">
    <div
      className="mx-auto flex w-full max-w-2xl flex-col gap-5 lg:mx-0 lg:max-w-[720px] lg:flex-1"
      style={
        chatBackgroundUrl || chatFallbackGradient
          ? {
              backgroundImage: [
                "linear-gradient(rgba(7,9,13,0.88), rgba(7,9,13,0.88))",
                chatBackgroundUrl ? `url(${chatBackgroundUrl})` : null,
                chatFallbackGradient,
              ]
                .filter(Boolean)
                .join(", "),
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

    <aside className="hidden lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:gap-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold">
          <UsersIcon size={16} />
          Contactos en línea
        </h3>
        {onlineDirectRooms.length === 0 ? (
          <p className="text-xs text-[var(--color-text-muted)]">Nadie en línea todavía.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {onlineDirectRooms.map((room) => (
              <Link
                key={room.id}
                href={`/chat/${room.id}`}
                className="flex items-center gap-2.5 rounded-xl px-1 py-1 transition-colors hover:bg-[var(--color-surface-secondary)]"
              >
                <Avatar name={room.peer!.displayName} avatarUri={room.peer!.avatarUri} gradient={room.peer!.avatarGradient} size={32} showOnline online />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{room.peer!.displayName}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
        <h3 className="font-display text-sm font-bold">Filtros rápidos</h3>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>Solo favoritas</span>
          <input
            type="checkbox"
            checked={onlyFavorites}
            onChange={(e) => setOnlyFavorites(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-orange)]"
          />
        </label>
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
        <h3 className="mb-1 font-display text-sm font-bold">Acciones rápidas</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm font-medium transition-colors hover:bg-[var(--color-surface-secondary)] cursor-pointer"
        >
          + Crear sala pública
        </button>
        <Link
          href="/chat/public"
          className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface-secondary)]"
        >
          <CompassIcon size={16} />
          Explorar salas
        </Link>
        <Link
          href="/communities"
          className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface-secondary)]"
        >
          <CompassIcon size={16} />
          Explorar comunidades
        </Link>
      </div>
    </aside>
    </div>
  );
}
