"use client";

import Link from "next/link";
import { useState } from "react";

import { Avatar } from "@/components/Avatar";
import { ChatRoomListItem } from "@/components/ChatRoomListItem";
import { ContextSidebar, ContextSidebarSection } from "@/components/ContextSidebar";
import { CompassIcon, UsersIcon } from "@/components/icons";
import { GradientButton } from "@/components/GradientButton";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { MenziIllustrationState } from "@/components/illustrations/MenziIllustrationState";
import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { communityFallbackGradient } from "@/lib/communities/backgroundStyle";
import { useCommunity } from "@/lib/communities/CommunityContext";
import { findUser } from "@/lib/store/selectors";
import type { ChatRoom } from "@/lib/types";

type ChatListTab = "directos" | "publicas";

/** Actividad más reciente de una sala — último mensaje si ya hubo alguno, si no cuándo se creó
 * (una sala recién unida/creada sin mensajes todavía debe listarse por su propia fecha, no
 * quedar siempre al final). */
function lastActivity(room: ChatRoom): number {
  return new Date(room.lastMessage?.createdAt ?? room.createdAt).getTime();
}

// Favoritas primero dentro de cada pestaña — reemplaza la sección "Favoritos" separada de arriba
// (ver referencia diseñoWeb/: dos pestañas, no tres bloques apilados); la estrella en
// ChatRoomListItem sigue marcando cuáles son. Dentro de cada grupo (favorita/no favorita), por
// actividad más reciente primero — antes el orden era el que fuera que trajera el fetch inicial,
// así que enviar un mensaje nunca subía esa conversación al tope de la lista.
function sortByActivity(rooms: ChatRoom[]): ChatRoom[] {
  return [...rooms].sort((a, b) => {
    const favDiff = Number(b.favorite) - Number(a.favorite);
    if (favDiff !== 0) return favDiff;
    return lastActivity(b) - lastActivity(a);
  });
}

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
  const [tab, setTab] = useState<ChatListTab>("directos");

  const allMyRooms = state.social.rooms.filter((r) => r.type === "direct" || r.joined);
  const myRooms = onlyFavorites ? allMyRooms.filter((r) => r.favorite) : allMyRooms;
  const directRooms = sortByActivity(myRooms.filter((r) => r.type === "direct"));
  const publicRooms = sortByActivity(myRooms.filter((r) => r.type === "public"));
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
        <div>
          <h1 className="font-display text-2xl font-bold">Chats / Mensajes</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Conecta, habla y comparte tu pasión</p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          style={{ background: accent.color }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-[var(--color-text-on-accent)] cursor-pointer"
          aria-label="Crear sala"
          title="Crear sala"
        >
          +
        </button>
      </div>

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        options={[
          { value: "directos", label: "Mensajes directos" },
          { value: "publicas", label: "Salas públicas" },
        ]}
      />

      {showCreate && (
        <div className="menzo-panel flex flex-col gap-3 p-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la sala"
            className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-orange)]"
          />
          <GradientButton label="Crear" onClick={handleCreate} disabled={!name.trim()} loading={creating} size="md" />
        </div>
      )}

      {myRooms.length === 0 ? (
        <MenziIllustrationState
          image="/illustrations/menzi/menzi-chat.webp"
          alt=""
          title="Todavía no hay chats"
          description="Únete a una sala pública o inicia una conversación directa para empezar."
          size="medium"
          priority
        />
      ) : tab === "directos" ? (
        directRooms.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no tienes conversaciones directas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {directRooms.map((room) => (
              <ChatRoomListItem key={room.id} room={room} allowRemove />
            ))}
          </div>
        )
      ) : publicRooms.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Tus próximas historias comienzan aquí.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {publicRooms.map((room) => (
            <ChatRoomListItem
              key={room.id}
              room={room}
              allowRemove
              lastMessageAuthorName={
                room.lastMessage ? findUser(state.social, room.lastMessage.senderId)?.displayName : undefined
              }
            />
          ))}
        </div>
      )}
    </div>

    <ContextSidebar>
      <ContextSidebarSection title="Amigos en línea" icon={<UsersIcon size={16} />}>
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
      </ContextSidebarSection>

      <ContextSidebarSection title="Filtros rápidos">
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>Solo favoritas</span>
          <input
            type="checkbox"
            checked={onlyFavorites}
            onChange={(e) => setOnlyFavorites(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-orange)]"
          />
        </label>
      </ContextSidebarSection>

      <ContextSidebarSection title="Acciones rápidas">
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
      </ContextSidebarSection>
    </ContextSidebar>
    </div>
  );
}
