"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
    <div className="mx-auto flex h-screen w-full max-w-2xl flex-col px-4 md:px-8">
      <div className="flex items-center gap-3 border-b border-[var(--color-border-soft)] py-4">
        <button onClick={() => router.push("/chat")} className="cursor-pointer text-[var(--color-text-secondary)]" aria-label="Volver">
          <BackIcon />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-semibold">{headerTitle}</p>
          {!!headerSubtitle && <p className="text-xs text-[var(--color-green)]">{headerSubtitle}</p>}
        </div>
        <div className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2.5">
        {messages.length === 0 ? (
          <p className="m-auto text-sm text-[var(--color-text-muted)]">Aún no hay mensajes aquí. Sé el primero en escribir algo.</p>
        ) : (
          messages.map((m) => <ChatBubble key={m.id} message={m} author={findUser(state.social, m.authorId)} isOwn={m.authorId === LOCAL_USER_ID} />)
        )}
        <div ref={listEndRef} />
      </div>

      <div className="flex items-end gap-2 border-t border-[var(--color-border-soft)] py-3">
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-orange)] text-[var(--color-text-on-accent)] disabled:opacity-50 cursor-pointer"
          aria-label="Enviar mensaje"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
