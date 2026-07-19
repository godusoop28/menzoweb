"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { GradientButton } from "@/components/GradientButton";
import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import type { CommunityEvent } from "@/lib/types";

export default function EventsPage() {
  const { state, actions } = useAppState();
  const [showCreate, setShowCreate] = useState(false);
  const todayKey = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    actions.loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { today, upcoming, past } = useMemo(() => {
    const sorted = [...state.social.events].sort((a, b) => a.date.localeCompare(b.date));
    return {
      today: sorted.filter((e) => e.date === todayKey),
      upcoming: sorted.filter((e) => e.date > todayKey),
      past: sorted.filter((e) => e.date < todayKey).reverse(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.social.events]);

  const isEmpty = today.length === 0 && upcoming.length === 0 && past.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Eventos</h1>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium cursor-pointer"
        >
          Crear evento
        </button>
      </div>

      {showCreate && <CreateEventForm onDone={() => setShowCreate(false)} />}

      {isEmpty && <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">No hay eventos programados todavía.</p>}

      <EventSection title="Hoy" events={today} />
      <EventSection title="Próximos" events={upcoming} />
      <EventSection title="Anteriores" events={past} />
    </div>
  );
}

function EventSection({ title, events }: { title: string; events: CommunityEvent[] }) {
  if (events.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">{title}</h2>
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

function EventCard({ event }: { event: CommunityEvent }) {
  const { actions } = useAppState();
  const attending = event.attendees.includes(LOCAL_USER_ID);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-violet)]">{event.kind}</p>
      <Link href={`/events/${event.id}`} className="text-lg font-semibold">
        {event.title}
      </Link>
      <p className="text-sm text-[var(--color-text-muted)]">
        {event.date} · {event.time} · {event.attendees.length} asistentes
      </p>
      <GradientButton
        label={attending ? "Cancelar asistencia" : "Confirmar asistencia"}
        onClick={() => actions.attendEvent(event.id)}
        gradient={attending ? "community" : "fire"}
        size="md"
      />
    </div>
  );
}

function CreateEventForm({ onDone }: { onDone: () => void }) {
  const { actions } = useAppState();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [kind, setKind] = useState("Encuentro");
  const [submitting, setSubmitting] = useState(false);

  const valid = title.trim().length > 0 && date.length > 0 && time.length > 0;

  async function handleCreate() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const created = await actions.createEvent({ title: title.trim(), description: description.trim(), date, time, kind });
      if (created) onDone();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título del evento"
        className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm outline-none"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción"
        rows={2}
        className="w-full resize-none rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm outline-none"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm outline-none"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="flex-1 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm outline-none"
        />
      </div>
      <input
        value={kind}
        onChange={(e) => setKind(e.target.value)}
        placeholder="Tipo (Encuentro, Maratón…)"
        className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm outline-none"
      />
      <GradientButton label="Crear evento" onClick={handleCreate} disabled={!valid} loading={submitting} size="md" />
    </div>
  );
}
