"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { BackIcon, CameraIcon, ImageIcon, SendIcon, UsersIcon } from "@/components/icons";
import { ChatBubble } from "@/components/ChatBubble";
import { TypingBubble } from "@/components/TypingBubble";
import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";
import { useRoomSocket } from "@/lib/realtime/useRoomSocket";
import { findRoom, findUser, messagesForRoom } from "@/lib/store/selectors";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
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

  useEffect(() => {
    if (!removalReason) return;
    showToast(removalReason === "banned" ? "Fuiste baneado de esta sala." : "Fuiste expulsado de esta sala.");
    router.push("/chat");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [removalReason]);

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

  // Sigue el contenedor de scroll real (el <main> compartido del app shell, ver AppShell.tsx) para
  // saber si el usuario está cerca del fondo antes de decidir si un mensaje nuevo debe forzar el
  // scroll o solo mostrar el aviso "Nuevos mensajes".
  useEffect(() => {
    const container = listEndRef.current?.closest("main");
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
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 md:px-8">
      {/* Header y barra de voz van juntos en un solo contenedor sticky — antes la barra de voz
          (con el botón de mute y los participantes) era un bloque aparte que se iba con el
          scroll de los mensajes, así que había que subir/bajar para volver a encontrarla. */}
      <div className="sticky top-0 z-10">
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
            <p className="truncate font-semibold">{headerTitle}</p>
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
          messages.map((m) => (
            <ChatBubble key={m.id} message={m} author={findUser(state.social, m.authorId)} isOwn={m.authorId === LOCAL_USER_ID} />
          ))
        )}
        <TypingBubble typingUsers={typingUsers} />
        <div ref={listEndRef} />
      </div>

      {showNewMessagesPill && (
        <div className="sticky bottom-[calc(9rem+env(safe-area-inset-bottom))] z-20 flex justify-center md:bottom-16">
          <button
            onClick={() => scrollToBottom(true)}
            style={{ background: accent.color }}
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-[var(--color-text-on-accent)] shadow-lg cursor-pointer"
          >
            Nuevos mensajes ↓
          </button>
        </div>
      )}

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex items-end gap-2 border-t border-[var(--color-border-soft)] bg-[var(--color-background)]/95 py-3 backdrop-blur-md md:bottom-0">
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
          className="flex-1 resize-none rounded-2xl border border-transparent bg-[var(--color-surface-secondary)] px-4 py-2.5 text-sm outline-none transition-colors focus:border-[var(--color-orange)] placeholder:text-[var(--color-text-muted)]"
        />
        <button
          onClick={handleSend}
          disabled={!draft.trim() || sending}
          style={{ background: accent.color, boxShadow: `0 4px 14px -2px ${accent.color}80` }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--color-text-on-accent)] transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          aria-label="Enviar mensaje"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
