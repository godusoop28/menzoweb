"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

import { LiveIcon } from "@/components/icons";
import { LiveRoomsGrid } from "@/components/LiveRoomsGrid";
import { useAccent } from "@/lib/AccentContext";
import { useAppState } from "@/lib/AppStateContext";

/** Pantalla propia para el nav "LIVE" — antes ese link del sidebar apuntaba a /chat/public (la
 * misma URL que "Chats > Salas públicas"), así que no tenía identidad visual distinta ni servía
 * de destino real: si ya estabas en /chat/public y tocabas LIVE, no pasaba nada visible. Esta
 * pantalla es el destino real, enfocada solo en salas en vivo (loadLiveRooms, mismo poll de 15s
 * que ya usaba el grid de Inicio). El directorio completo de salas públicas sigue en /chat/public
 * — se linkea desde acá como salida para cuando no hay nada en vivo. */
export default function LivePage() {
  const { state, actions } = useAppState();
  const accent = useAccent();

  useEffect(() => {
    actions.loadLiveRooms();
    const interval = setInterval(() => actions.loadLiveRooms(), 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const liveRooms = useMemo(() => state.social.rooms.filter((r) => r.type === "public" && r.live), [state.social.rooms]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold">
            <LiveIcon size={22} className="text-[var(--color-coral)]" /> LIVE
          </h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Salas con voz en vivo, ahora mismo.</p>
        </div>
        <Link
          href="/chat"
          style={{ background: accent.color }}
          className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap text-[var(--color-text-on-accent)]"
        >
          + Iniciar LIVE
        </Link>
      </div>

      {liveRooms.length > 0 ? (
        <LiveRoomsGrid rooms={liveRooms} />
      ) : (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-soft)]">
            <LiveIcon size={26} className="text-[var(--color-text-muted)]" />
          </span>
          <p className="text-sm text-[var(--color-text-muted)]">
            Nadie está en vivo todavía. Iniciá un LIVE en una sala de chat para verlo acá.
          </p>
          <Link href="/chat/public" className="text-sm font-semibold text-[var(--color-orange)]">
            Ver todas las salas públicas →
          </Link>
        </div>
      )}
    </div>
  );
}
