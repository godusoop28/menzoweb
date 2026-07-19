"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { GradientButton } from "@/components/GradientButton";
import { BackIcon } from "@/components/icons";
import { MemberCard } from "@/components/MemberCard";
import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useAppState();
  const event = state.social.events.find((e) => e.id === id);

  useEffect(() => {
    if (!event) actions.loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!event) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">No encontramos este evento.</p>
        <button onClick={() => router.back()} className="text-sm text-[var(--color-cyan)] cursor-pointer">
          Volver
        </button>
      </div>
    );
  }

  const attending = event.attendees.includes(LOCAL_USER_ID);
  const attendees = event.attendees
    .map((uid) => state.social.users.find((u) => u.id === uid))
    .filter((u): u is NonNullable<typeof u> => !!u);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6 md:px-8">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
        <BackIcon size={20} />
        Volver
      </button>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--color-violet)]">{event.kind}</p>
        <h1 className="font-display text-2xl font-bold">{event.title}</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          {event.date} · {event.time}
        </p>
      </div>

      <p className="text-[15px] text-[var(--color-text-secondary)]">{event.description}</p>

      <GradientButton
        label={attending ? "Cancelar asistencia" : "Confirmar asistencia"}
        onClick={() => actions.attendEvent(event.id)}
        gradient={attending ? "community" : "fire"}
      />

      <h2 className="mt-2 text-sm font-semibold">Asistentes ({attendees.length})</h2>
      <div className="flex flex-wrap gap-3">
        {attendees.map((user) => (
          <MemberCard key={user.id} user={user} variant="column" />
        ))}
      </div>
    </div>
  );
}
