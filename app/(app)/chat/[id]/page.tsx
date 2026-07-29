"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { BackIcon, CameraIcon, ImageIcon, SendIcon, UsersIcon } from "@/components/icons";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingBubble } from "@/components/TypingBubble";
import { chatApi, getMyRealId, mapUserProfile, usersApi } from "@/lib/api";
import type { RoomRole } from "@/lib/api/types";
import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { useRoomSocket } from "@/lib/realtime/useRoomSocket";
import { findRoom, findUser, messagesForRoom } from "@/lib/store/selectors";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { dateSeparatorLabel, isSameDay } from "@/lib/time";
import { useToast } from "@/lib/ToastContext";
import { useVoiceRoomContext } from "@/lib/voice/VoiceRoomContext";

const NEAR_BOTTOM_THRESHOLD_PX = 120;

export default function ChatRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useAppState();
  const accent = useAccent();
  const showToast = useToast();
  const voiceCtx = useVoiceRoomContext();
  // El provider de voz es global (sobrevive a la navegación) — acá se recorta a "¿esta sala
  // específica está en vivo para mí?" para que el resto de esta pantalla no tenga que cambiar.
  const isThisRoomLive = voiceCtx.activeRoomId === id;
  const voice = {
    connected: voiceCtx.connected && isThisRoomLive,
    connecting: voiceCtx.connecting && isThisRoomLive,
    muted: voiceCtx.muted,
    participants: isThisRoomLive ? voiceCtx.participants : [],
    speakingLevels: isThisRoomLive ? voiceCtx.speakingLevels : new Map<string, number>(),
    join: () => (id ? voiceCtx.join(id) : Promise.resolve()),
    leave: voiceCtx.leave,
    toggleMute: voiceCtx.toggleMute,
  };
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const isNearBottomRef = useRef(true);
  const prevMessageCountRef = useRef(0);
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);

  const room = findRoom(state.social, id);
  const messages = useMemo(() => messagesForRoom(state.social, id), [state.social, id]);
  const { typingUsers, publishTyping, removalReason } = useRoomSocket(id);
  const [memberRoles, setMemberRoles] = useState<Map<string, RoomRole>>(new Map());
  const [peerAreFriends, setPeerAreFriends] = useState(false);

  useEffect(() => {
    if (!removalReason) return;
    showToast(removalReason === "banned" ? "Fuiste baneado de esta sala." : "Fuiste expulsado de esta sala.");
    router.push("/chat");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removalReason]);

  useEffect(() => {
    if (!id || room?.type !== "public") return;
    chatApi
      .members(id)
      .then((dtos) => {
        const myRealId = getMyRealId();
        const map = new Map<string, RoomRole>();
        for (const dto of dtos) {
          map.set(dto.user.id === myRealId ? LOCAL_USER_ID : dto.user.id, dto.role);
        }
        setMemberRoles(map);
      })
      .catch((error) => console.warn("[menzo/web] loadRoomMembers failed", error));
  }, [id, room?.type]);

  // room.peer viene con los datos livianos del DTO de la sala (sin info de relación) — para saber
  // si es amigo hay que pedir su perfil completo aparte, solo cuando el chat es directo. La JSX
  // que lo muestra ya filtra por room.type === "direct", así que no hace falta resetear a false
  // al cambiar de sala — un valor previo nunca se renderiza fuera de un chat directo.
  const directPeerId = room?.type === "direct" ? room.peer?.id : undefined;
  useEffect(() => {
    if (!directPeerId) return;
    usersApi
      .getById(directPeerId)
      .then((dto) => setPeerAreFriends(mapUserProfile(dto, getMyRealId()).areFriends ?? false))
      .catch((error) => console.warn("[menzo/web] loadPeerProfile failed", error));
  }, [directPeerId]);

  useEffect(() => {
    if (!id) return;
    actions.loadRoomMessages(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function scrollToBottom(smooth: boolean) {
    listEndRef.current?.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" });
    isNearBottomRef.current = true;
    setShowNewMessagesPill(false);
  }

  // Sigue el contenedor de scroll real — antes era el <main> compartido del app shell, pero esa
  // ruta ya no scrollea (ver AppShell.tsx): /chat/[id] tiene su propia región de scroll, solo para
  // los mensajes, así que este ref apunta directo a ella en vez de buscar un <main> ancestro.
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = messagesScrollRef.current;
    if (!container) return;
    function handleScroll() {
      if (!container) return;
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      isNearBottomRef.current = distanceFromBottom < NEAR_BOTTOM_THRESHOLD_PX;
      if (isNearBottomRef.current) setShowNewMessagesPill(false);
    }
    container.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [id]);

  // Cambiar de sala SIEMPRE debe caer al fondo, sin importar si la nueva sala tiene la misma
  // cantidad de mensajes que la anterior — esa coincidencia es justo lo que rompía el scroll antes
  // (el efecto solo dependía de messages.length, así que a veces nunca se volvía a disparar).
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- imperative scroll-position sync on room switch, not derived render state; must run synchronously before paint
    scrollToBottom(false);
    prevMessageCountRef.current = messages.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Mensaje propio: siempre baja. Mensaje ajeno: solo baja si ya estábamos cerca del fondo; si no,
  // se muestra el aviso "Nuevos mensajes" en vez de arrancar al usuario de lo que estaba leyendo.
  useLayoutEffect(() => {
    const prevCount = prevMessageCountRef.current;
    const newCount = messages.length;
    if (newCount > prevCount) {
      const lastMessage = messages[newCount - 1];
      if (lastMessage?.authorId === LOCAL_USER_ID || isNearBottomRef.current) {
        scrollToBottom(false);
      } else {
        setShowNewMessagesPill(true);
      }
    }
    prevMessageCountRef.current = newCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || sending || !id) return;
    setSending(true);
    try {
      await actions.sendMessage(id, trimmed);
      setDraft("");
      requestAnimationFrame(() => scrollToBottom(true));
    } catch (error) {
      console.warn("[menzo/web] sendMessage failed", error);
    } finally {
      setSending(false);
    }
  }

  function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !id) return;
    actions.updateRoomCover(id, URL.createObjectURL(file), file);
  }

  function handleBackgroundFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !id) return;
    actions.updateRoomBackground(id, URL.createObjectURL(file), file);
  }

  const headerTitle = room?.type === "direct" ? room?.peer?.displayName ?? "Conversación" : room?.name ?? "Conversación";
  const headerOnline = room?.type === "direct" ? !!room?.peer?.isOnline : !!room && room.onlineCount > 0;
  const headerSubtitle =
    room?.type === "direct" ? (room?.peer?.isOnline ? "En línea" : "Desconectado") : room ? `${room.onlineCount} conectados` : "";

  if (!room) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">No encontramos esta conversación.</p>
        <button onClick={() => router.push("/chat")} className="text-sm text-[var(--color-cyan)] cursor-pointer">
          Volver a chats
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      {/* Header y barra de voz van juntos, arriba de la única región con scroll — antes estaban
          "sticky" dentro del scroll compartido de toda la página, lo que rompía por completo en
          móvil apenas el teclado cambiaba el viewport visual (ver AppShell.tsx: esta ruta ya no
          comparte scroll con el resto de la app, así que un simple flujo normal alcanza). */}
      <div className="shrink-0 px-4 md:px-8">
        <div
          className="flex items-center gap-3 border-b border-[var(--color-border-soft)] bg-cover bg-center py-3 backdrop-blur-md"
          style={{
            backgroundColor: "rgba(7,9,13,0.95)",
            backgroundImage: room.coverUri
              ? `linear-gradient(rgba(7,9,13,0.55), rgba(7,9,13,0.75)), url(${room.coverUri})`
              : undefined,
          }}
        >
          <button onClick={() => router.push("/chat")} className="cursor-pointer text-[var(--color-text-secondary)]" aria-label="Volver">
            <BackIcon />
          </button>
          {room.type === "direct" && room.peer ? (
            <Avatar name={room.peer.displayName} avatarUri={room.peer.avatarUri} gradient={room.peer.avatarGradient} size={32} showOnline online={room.peer.isOnline} />
          ) : (
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, var(--color-cyan), var(--color-blue))" }}
            >
              {headerTitle.charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate font-semibold">
              <span className="truncate">{headerTitle}</span>
              {room.type === "direct" && peerAreFriends && (
                <span className="shrink-0 rounded-full bg-[var(--color-surface-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-cyan)]">
                  Amigos
                </span>
              )}
            </p>
            {!!headerSubtitle && (
              <p className={`text-xs ${headerOnline ? "text-[var(--color-green)]" : "text-[var(--color-text-muted)]"}`}>{headerSubtitle}</p>
            )}
          </div>
          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
          <input ref={backgroundInputRef} type="file" accept="image/*" onChange={handleBackgroundFile} className="hidden" />
          {room.type === "public" && (
            <Link
              href={`/chat/${id}/members`}
              aria-label="Ver miembros"
              title="Miembros"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60"
            >
              <UsersIcon size={15} />
            </Link>
          )}
          <button
            onClick={() => coverInputRef.current?.click()}
            aria-label="Cambiar portada de la sala"
            title="Cambiar portada"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 cursor-pointer"
          >
            <CameraIcon size={15} />
          </button>
          <button
            onClick={() => backgroundInputRef.current?.click()}
            aria-label="Cambiar fondo de la conversación"
            title="Cambiar fondo del chat"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 cursor-pointer"
          >
            <ImageIcon size={15} />
          </button>
          <button
            onClick={voice.connected ? voice.leave : voice.join}
            disabled={voice.connecting}
            aria-label={voice.connected ? "Salir del live" : "Unirse al live"}
            title={voice.connected ? "Salir del live" : "Unirse al live"}
            className={`relative flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-bold uppercase tracking-wide text-white transition-colors disabled:opacity-60 cursor-pointer ${
              voice.connected ? "bg-[var(--color-coral)]" : "bg-black/40 hover:bg-black/60"
            }`}
          >
            {voice.connected && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />}
            <span>Live</span>
            {voice.participants.length > 0 && <span className="font-normal normal-case">{voice.participants.length}</span>}
          </button>
        </div>

        {(voice.connected || voice.participants.length > 0) && (
          <div className="flex items-center gap-3 border-b border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2.5">
            <div className="flex flex-1 flex-wrap items-center gap-3">
              {voice.participants.map((p) => {
                const level = voice.speakingLevels.get(p.id) ?? 0;
                return (
                  <div key={p.id} className="flex flex-col items-center gap-1">
                    <span
                      className="flex items-center justify-center rounded-full transition-transform duration-150 ease-out"
                      style={{
                        transform: `scale(${1 + level * 0.22})`,
                        boxShadow: level > 0.05 ? `0 0 ${6 + level * 14}px ${level * 3}px ${accent.color}80` : undefined,
                      }}
                    >
                      <Avatar name={p.displayName} avatarUri={p.avatarUri} gradient={p.avatarGradient} size={40} />
                    </span>
                    <span className="max-w-[64px] truncate text-[11px] font-medium">{p.displayName}</span>
                  </div>
                );
              })}
              {voice.participants.length === 0 && (
                <span className="text-xs text-[var(--color-text-muted)]">Nadie en la voz todavía</span>
              )}
            </div>
            {voice.connected && (
              <button
                onClick={voice.toggleMute}
                aria-label={voice.muted ? "Activar micrófono" : "Silenciar micrófono"}
                title={voice.muted ? "Activar micrófono" : "Silenciar micrófono"}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm cursor-pointer ${
                  voice.muted ? "bg-[var(--color-coral)]/20 text-[var(--color-coral)]" : "bg-[var(--color-surface-secondary)]"
                }`}
              >
                {voice.muted ? "🔇" : "🎤"}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Única región con scroll de toda la pantalla — header y composer quedan afuera de este div
          (son hermanos "shrink-0" del contenedor flex-col de más arriba), así nunca compiten por
          el mismo espacio de scroll ni el composer puede terminar flotando en medio de la
          conversación, que era la causa real del bug: antes esta zona NO tenía su propio scroll,
          así que el <main> compartido de toda la app scrolleaba de punta a punta (header + todos
          los mensajes + composer) y el composer "sticky" quedaba fijo a un <main> cuya altura no
          se enteraba del teclado en Android — el resultado visual era el composer atrapado a mitad
          de camino, con mensajes visibles arriba y abajo suyo. */}
      <div ref={messagesScrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 md:px-8">
        <div
          className="relative flex flex-col gap-2.5 rounded-b-2xl bg-cover bg-center py-4"
          style={
            room.backgroundUri
              ? {
                  backgroundImage: `linear-gradient(rgba(7,9,13,0.62), rgba(7,9,13,0.62)), url(${room.backgroundUri})`,
                }
              : undefined
          }
        >
          {messages.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Aún no hay mensajes aquí. Sé el primero en escribir algo.</p>
          ) : (
            messages.map((m, i) => {
              const prev = messages[i - 1];
              const showDateSeparator = !prev || !isSameDay(prev.createdAt, m.createdAt);
              const grouped =
                !!prev &&
                !showDateSeparator &&
                m.type !== "system" &&
                prev.type === m.type &&
                prev.authorId === m.authorId &&
                new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60 * 1000;
              return (
                <Fragment key={m.id}>
                  {showDateSeparator && (
                    <div className="flex justify-center py-1">
                      <span className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
                        {dateSeparatorLabel(m.createdAt)}
                      </span>
                    </div>
                  )}
                  <ChatBubble
                    message={m}
                    author={findUser(state.social, m.authorId)}
                    isOwn={m.authorId === LOCAL_USER_ID}
                    role={memberRoles.get(m.authorId)}
                    grouped={grouped}
                  />
                </Fragment>
              );
            })
          )}
          <TypingBubble typingUsers={typingUsers} />
          <div ref={listEndRef} />
        </div>

        {/* "sticky" acá SÍ es correcto: su contenedor de scroll es esta misma región de mensajes,
            no toda la página, así que "bottom" se resuelve contra el borde real y visible. */}
        {showNewMessagesPill && (
          <div className="sticky bottom-3 z-20 flex justify-center">
            <button
              onClick={() => scrollToBottom(true)}
              style={{ background: accent.color }}
              className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-[var(--color-text-on-accent)] shadow-lg cursor-pointer"
            >
              Nuevos mensajes ↓
            </button>
          </div>
        )}
      </div>

      <div
        className="flex shrink-0 items-end gap-2 border-t border-[var(--color-border-soft)] bg-[var(--color-background)]/95 px-4 py-3 backdrop-blur-md md:px-8"
        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.trim()) publishTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Escribe un mensaje…"
          rows={1}
          className="max-h-32 flex-1 resize-none overflow-y-auto rounded-2xl border border-transparent bg-[var(--color-surface-secondary)] px-4 py-2.5 text-base outline-none transition-colors focus:border-[var(--color-orange)] placeholder:text-[var(--color-text-muted)] md:text-sm"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          style={{ background: accent.color, boxShadow: `0 4px 14px -2px ${accent.color}80` }}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--color-text-on-accent)] transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          aria-label="Enviar mensaje"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
