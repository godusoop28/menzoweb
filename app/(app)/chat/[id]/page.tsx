"use client";

import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { BackIcon, SendIcon, SettingsIcon } from "@/components/icons";
import { ChatBubble } from "@/components/ChatBubble";
import { LiveAutoplayBar } from "@/components/live/LiveAutoplayBar";
import { LiveRoomPanel } from "@/components/live/LiveRoomPanel";
import { RoomInfoModal } from "@/components/room/RoomInfoModal";
import { RoomSettingsPanel } from "@/components/room/RoomSettingsPanel";
import { TypingBubble } from "@/components/TypingBubble";
import { chatApi, getMyRealId, mapUserProfile, usersApi } from "@/lib/api";
import type { RoomRole } from "@/lib/api/types";
import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { useLiveRoomContext } from "@/lib/live/LiveRoomContext";
import { useRoomSocket } from "@/lib/realtime/useRoomSocket";
import { findRoom, findUser, messagesForRoom } from "@/lib/store/selectors";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { dateSeparatorLabel, isSameDay } from "@/lib/time";
import { useToast } from "@/lib/ToastContext";

const NEAR_BOTTOM_THRESHOLD_PX = 120;

export default function ChatRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useAppState();
  const accent = useAccent();
  const showToast = useToast();
  const live = useLiveRoomContext();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<"general" | "live">("general");
  const [showInfo, setShowInfo] = useState(false);
  const [showLivePanel, setShowLivePanel] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
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

  // Consultar el estado LIVE apenas se abre el chat (cabecera/anuncio) — no implica unirse al
  // audio todavía, ver sección 11 del pedido.
  useEffect(() => {
    if (!id) return;
    live.watchRoom(id);
    return () => live.unwatchRoom(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Si hay un LIVE activo en esta sala y todavía no estoy conectado a ninguno, entrar
  // automáticamente como AUDIENCE (solo escuchar, sin pedir permiso de micrófono). Si el
  // navegador bloquea el autoplay, LiveAutoplayBar se encarga de mostrarlo — este efecto no
  // oculta ese estado ni finge que ya se puede escuchar.
  useEffect(() => {
    if (!id || live.watchedRoomId !== id) return;
    const isActive = live.viewingState?.status === "active";
    if (isActive && live.activeRoomId !== id && !live.connecting) {
      live.join(id).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, live.watchedRoomId, live.viewingState?.status, live.activeRoomId, live.connecting]);

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

  const isThisRoomLive = live.watchedRoomId === id ? live.viewingState?.status === "active" : room.live;
  const liveParticipantCount =
    live.activeRoomId === id ? live.participants.length : (live.watchedRoomId === id ? live.viewingState?.participantCount : room.liveSummary?.participantCount) ?? 0;
  const canModerate = room.role === "owner" || room.role === "co_host";

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col">
      <LiveAutoplayBar />
      {/* Cabecera limpia: solo regresar, avatar, nombre, conectados, LIVE (si existe) y la tuerca
          para quien tenga permisos — el resto de la administración (imagen/portada/fondo/
          invitaciones/moderación) vive en RoomSettingsPanel, no acá (ver sección 5 del pedido). */}
      <div className="shrink-0 px-4 md:px-8">
        <div className="flex items-center gap-3 border-b border-[var(--color-border-soft)] bg-[rgba(7,9,13,0.95)] py-3 backdrop-blur-md">
          <button onClick={() => router.push("/chat")} className="cursor-pointer text-[var(--color-text-secondary)]" aria-label="Volver">
            <BackIcon />
          </button>
          {room.type === "direct" && room.peer ? (
            <Avatar name={room.peer.displayName} avatarUri={room.peer.avatarUri} gradient={room.peer.avatarGradient} size={32} showOnline online={room.peer.isOnline} />
          ) : (
            <button onClick={() => setShowInfo(true)} className="cursor-pointer" aria-label="Información de la sala">
              <Avatar name={headerTitle} avatarUri={room.avatarUri} gradient={room.gradient} size={32} />
            </button>
          )}
          <button onClick={() => setShowInfo(true)} className="min-w-0 flex-1 cursor-pointer text-left">
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
          </button>
          {isThisRoomLive ? (
            <button
              onClick={() => setShowLivePanel(true)}
              aria-label={`Abrir LIVE · ${liveParticipantCount} personas`}
              title="Abrir LIVE"
              className="relative flex h-8 items-center gap-1.5 rounded-full bg-[var(--color-coral)] px-3 text-xs font-bold uppercase tracking-wide text-white transition-colors cursor-pointer"
            >
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
              <span>Live</span>
              {liveParticipantCount > 0 && <span className="font-normal normal-case">{liveParticipantCount}</span>}
            </button>
          ) : (
            canModerate &&
            room.type === "public" && (
              <button
                onClick={() => {
                  setSettingsInitialTab("live");
                  setShowSettings(true);
                }}
                aria-label="Iniciar LIVE"
                title="Iniciar LIVE"
                className="flex h-8 items-center gap-1.5 rounded-full bg-black/40 px-3 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-black/60 cursor-pointer"
              >
                Iniciar LIVE
              </button>
            )
          )}
          {canModerate && (
            <button
              onClick={() => {
                setSettingsInitialTab("general");
                setShowSettings(true);
              }}
              aria-label="Configuración de la sala"
              title="Configuración de la sala"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/40 text-white transition-colors hover:bg-black/60 cursor-pointer"
            >
              <SettingsIcon size={16} />
            </button>
          )}
        </div>
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

      {showInfo && <RoomInfoModal room={room} onClose={() => setShowInfo(false)} />}
      {showSettings && (
        <RoomSettingsPanel room={room} onClose={() => setShowSettings(false)} initialTab={settingsInitialTab} />
      )}
      {showLivePanel && <LiveRoomPanel room={room} onMinimize={() => setShowLivePanel(false)} />}
    </div>
  );
}
