"use client";

import { useRouter } from "next/navigation";

import { PauseIcon, PlayIcon, VolumeIcon, VolumeMuteIcon } from "@/components/icons";
import { MenziDjBrand } from "@/components/music/MenziDjBrand";
import { useLiveRoomContext } from "@/lib/live/LiveRoomContext";
import { useMenziDjContext } from "@/lib/music/MenziDjContext";

/** Aislado en su propio componente: solo recibe la función de registro del contenedor, nunca
 * ningún otro valor del contexto — así el linter (react-hooks/refs) no tiene motivo para tratar
 * el resto de las lecturas de MenziDjContext en el resto del árbol como "acceso a un ref". */
function PlayerFrame({
  setContainer,
  style,
}: {
  setContainer: (el: HTMLDivElement | null) => void;
  style: React.CSSProperties;
}) {
  return (
    <div className="fixed z-[70] overflow-hidden rounded-2xl bg-black shadow-2xl transition-all duration-200 ease-out" style={style}>
      <div ref={setContainer} className="h-full w-full" />
    </div>
  );
}

/** Único <div> del reproductor oficial de YouTube para toda la app — vive acá, montado siempre
 * (ver AppShell), y solo cambia de tamaño/posición por CSS entre el modo grande (panel de Menzi
 * DJ abierto) y el modo miniatura flotante. Nunca se destruye ni se vuelve a crear al cambiar de
 * pantalla o minimizar (ver sección 15/23 del pedido) — controla eso MenziDjContext, no este
 * componente. */
export function MenziDjPlayerHost() {
  const music = useMenziDjContext();
  const live = useLiveRoomContext();
  const router = useRouter();

  const hasTrack = !!music.session?.currentVideoId;
  const frameStyle: React.CSSProperties = !hasTrack
    ? { width: 0, height: 0, opacity: 0, pointerEvents: "none", top: 0, left: 0 }
    : music.expanded
      ? { top: 16, right: 16, width: "min(260px, 40vw)", height: "min(146px, 22vw)" }
      : { bottom: 96, left: 16, width: 56, height: 56 };

  return (
    <>
      {/* El contenedor real del iframe siempre está montado, aunque no haya canción — así
          MenziDjContext puede crear el player la primera vez sin esperar un re-render. Con el
          panel de Menzi DJ abierto, el player se agranda a una esquina en vez de intentar encajar
          pixel a pixel dentro del sheet (que es centrado/de altura variable) — más simple y
          confiable que alinear un elemento fixed contra un modal cuya posición exacta no se
          conoce de antemano. */}
      <PlayerFrame setContainer={music.setPlayerContainer} style={frameStyle} />

      {hasTrack && !music.expanded && (
        <button
          onClick={() => {
            if (live.activeRoomId) router.push(`/chat/${live.activeRoomId}`);
            music.setExpanded(true);
          }}
          className="fixed bottom-24 left-4 z-[71] flex w-[220px] cursor-pointer items-center gap-2 rounded-full bg-[var(--color-surface-elevated)] py-1.5 pl-16 pr-2 text-left shadow-2xl ring-1 ring-[var(--color-border-strong)] md:bottom-6"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-cyan)]">
              <MenziDjBrand mode={music.session?.status === "playing" ? "playing" : "paused"} compact size={14} />
              Menzi DJ
            </div>
            <p className="truncate text-xs font-medium">{music.session?.currentTitle || "Reproduciendo…"}</p>
          </div>
          {(live.myRole === "host" || live.myRole === "co_host") && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                if (music.session?.status === "playing") music.pauseTrack();
                else music.resumeTrack();
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] cursor-pointer"
            >
              {music.session?.status === "playing" ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              music.toggleLocalMute();
            }}
            aria-label={music.localMuted ? "Activar música" : "Silenciar música"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] cursor-pointer"
          >
            {music.localMuted ? <VolumeMuteIcon size={14} /> : <VolumeIcon size={14} />}
          </span>
        </button>
      )}
    </>
  );
}
