"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { BackIcon, SendIcon } from "@/components/icons";
import { ChatBubble } from "@/components/ChatBubble";
import { useAppState } from "@/lib/AppStateContext";
import { findRoom, findUser, messagesForRoom } from "@/lib/store/selectors";
import { LOCAL_USER_ID } from "@/lib/store/localUser";

export default function ChatRoomPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useAppState();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const room = findRoom(state.social, id);
  const messages = useMemo(() => messagesForRoom(state.social, id), [state.social, id]);

  useEffect(() => {
    if (!id) return;
    actions.loadRoomMessages(id);
    const interval = setInterval(() => actions.loadRoomMessages(id), 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function handleSend() {
    const trimmed = draft.trim();
    if (!trimmed || sending || !id) return;
    setSending(true);
    try {
      await actions.sendMessage(id, trimmed);
      setDraft("");
      requestAnimationFrame(() => listEndRef.current?.scrollIntoView({ block: "end" }));
    } catch (error) {
      console.warn("[menzo/web] sendMessage failed", error);
    } finally {
      setSending(false);
    }
  }

  const headerTitle = room?.type === "direct" ? room?.peer?.displayName ?? "Conversación" : room?.name ?? "Conversación";
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
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--color-border-soft)] bg-[var(--color-background)]/95 py-3 backdrop-blur-md">
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
          {!!headerSubtitle && <p className="text-xs text-[var(--color-green)]">{headerSubtitle}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 py-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Aún no hay mensajes aquí. Sé el primero en escribir algo.</p>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const showAvatar = !prev || prev.authorId !== m.authorId;
            return (
              <ChatBubble
                key={m.id}
                message={m}
                author={findUser(state.social, m.authorId)}
                isOwn={m.authorId === LOCAL_USER_ID}
                showAvatar={showAvatar}
              />
            );
          })
        )}
        <div ref={listEndRef} />
      </div>

      <div className="sticky bottom-20 z-10 flex items-end gap-2 border-t border-[var(--color-border-soft)] bg-[var(--color-background)]/95 py-3 backdrop-blur-md md:bottom-0">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-orange)] text-[var(--color-text-on-accent)] shadow-[0_4px_14px_-2px_rgba(255,122,26,0.5)] transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
          aria-label="Enviar mensaje"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
