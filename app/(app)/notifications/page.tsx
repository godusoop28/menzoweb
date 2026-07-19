"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BellIcon, CalendarIcon, ChatIcon, CheckIcon, CommentIcon, HeartIcon, ProfileIcon } from "@/components/icons";
import { useAppState } from "@/lib/AppStateContext";
import { relativeTime } from "@/lib/time";
import type { Notification, NotificationCategory } from "@/lib/types";

type Category = "todo" | NotificationCategory;

const categories: { value: Category; label: string }[] = [
  { value: "todo", label: "Todo" },
  { value: "comentarios", label: "Comentarios" },
  { value: "likes", label: "Likes" },
  { value: "mensajes", label: "Mensajes" },
  { value: "eventos", label: "Eventos" },
  { value: "seguimientos", label: "Seguimientos" },
];

const categoryIcon: Record<NotificationCategory, typeof HeartIcon> = {
  comentarios: CommentIcon,
  likes: HeartIcon,
  mensajes: ChatIcon,
  eventos: CalendarIcon,
  seguimientos: ProfileIcon,
};

export default function NotificationsPage() {
  const { state, actions } = useAppState();
  const router = useRouter();
  const [category, setCategory] = useState<Category>("todo");

  useEffect(() => {
    actions.loadNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notifications = [...state.social.notifications]
    .filter((n) => category === "todo" || n.category === category)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function handleClick(n: Notification) {
    actions.markNotificationRead(n.id);
    if (n.relatedPostId) router.push(`/post/${n.relatedPostId}`);
    else if (n.relatedRoomId) router.push(`/chat/${n.relatedRoomId}`);
    else if (n.relatedUserId) router.push(`/member/${n.relatedUserId}`);
    else if (n.relatedEventId) router.push(`/events/${n.relatedEventId}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Notificaciones</h1>
        <button
          onClick={actions.markAllNotificationsRead}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] cursor-pointer"
        >
          <CheckIcon size={16} />
          Marcar todas
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium cursor-pointer ${
              category === c.value ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {notifications.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todo está tranquilo por ahora.</p>
        ) : (
          notifications.map((n) => {
            const Icon = categoryIcon[n.category] ?? BellIcon;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-3 rounded-xl border p-4 text-left cursor-pointer ${
                  n.read ? "border-[var(--color-border-soft)] bg-[var(--color-surface)]" : "border-[var(--color-orange)]/35 bg-[var(--color-surface-secondary)]"
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-elevated)]">
                  <Icon size={18} className="text-[var(--color-text-secondary)]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{n.title}</span>
                  <span className="block text-sm text-[var(--color-text-secondary)]">{n.body}</span>
                  <span className="mt-1 block text-xs text-[var(--color-text-muted)]">{relativeTime(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-coral)]" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
