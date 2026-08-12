"use client";

import { useRouter } from "next/navigation";

import { CloseIcon, PauseIcon, PlayIcon, PowerIcon, VolumeIcon, VolumeMuteIcon } from "@/components/icons";
import { MenziDjBrand } from "@/components/music/MenziDjBrand";
import { useLiveRoomContext } from "@/lib/live/LiveRoomContext";
import { useMenziDjContext } from "@/lib/music/MenziDjContext";

/** Aislado en su propio componente: solo recibe la función de registro del contenedor, nunca
 * ningún otro valor del contexto — así el linter (react-hooks/refs) no tiene motivo para tratar
 * el resto de las lecturas de MenziDjContext en el resto del árbol como "acceso a un ref". */
function PlayerFrame({
  setContainer,
  style,
  className,
}: {
  setContainer: (el: HTMLDivElement | null) => void;
  style: React.CSSProperties;
  className: string;
}) {
  return (
    <div className={className} style={style}>
      <div ref={setContainer} className="h-full w-full" />
    </div>
  );
}

/** Único <div> del reproductor oficial de YouTube para toda la app — vive acá, montado siempre
 * (ver AppShell), y solo cambia de tamaño/posición por CSS entre modos (mini flotante / grande al
 * abrir el panel / oculto / pantalla completa). Nunca se destruye ni se vuelve a crear al cambiar
 * de pantalla, minimizar o cambiar de modo (ver sección 15/23 del pedido, y la Fase 2 de video
 * modes) — controla eso MenziDjContext, no este componente.
 *
 * z-index: antes este frame vivía en z-[70]/z-[71], POR ENCIMA de Sheet (z-50) y ConfirmDialog
 * (z-[60]) — el mini-reproductor flotante podía tapar visualmente un diálogo de confirmación como
 * "Finalizar LIVE para todos". Ahora vive en el mismo nivel que las burbujas persistentes
 * (z-30, ver PersistentVoiceBubble), salvo en modo `fullscreen`, donde sí necesita ganarle a todo
 * (z-[95]) porque esa es literalmente su función. */
export function MenziDjPlayerHost() {
  const music = useMenziDjContext();
  const live = useLiveRoomContext();
  const router = useRouter();

  const hasTrack = !!music.session?.currentVideoId;

  let frameStyle: React.CSSProperties;
  let frameClassName = "fixed overflow-hidden bg-black shadow-2xl transition-all duration-200 ease-out";
  if (!hasTrack) {
    // Sin canción no hay nada que preservar todavía — este sí es un estado legítimamente
    // distinto (nunca se llega acá con un video ya cargado, ver MenziDjContext.ensurePlayer).
    frameStyle = { width: 0, height: 0, opacity: 0, pointerEvents: "none", top: 0, left: 0 };
    frameClassName += " z-30 rounded-2xl";
  } else if (music.fullscreen) {
    frameStyle = { top: 0, left: 0, width: "100vw", height: "100vh" };
    frameClassName += " z-[95] rounded-none";
  } else if (music.videoHidden) {
    // Mismo tamaño/posición que el modo mini — nunca width/height:0 mientras haya una canción
    // activa, para no arriesgar que el navegador trate el iframe como una superficie inactiva y
    // suspenda también el audio, no solo el render (mismo razonamiento que llevó a la corrección
    // equivalente del lado de menzomovil). Se cubre con una capa opaca propia, ver más abajo.
    frameStyle = music.expanded
      ? { top: 16, right: 16, width: "min(260px, 40vw)", height: "min(146px, 22vw)" }
      : { bottom: 96, left: 16, width: 56, height: 56 };
    frameClassName += " z-30 rounded-2xl";
  } else if (music.cinema) {
    // El iframe sigue viviendo FUERA del sheet (nunca se mueve al DOM del panel — ver
    // MenziDjContext) — MenziDjPanel mide su propio placeholder reservado y reporta esas
    // coordenadas acá (getBoundingClientRect ya es relativo al viewport, igual que
    // `position:fixed`, así que se usan tal cual sin convertir nada). Sin nada reportado
    // todavía (primer frame, o el panel cerrándose) cae a una posición razonable cerca del
    // borde superior en vez de desaparecer.
    frameStyle = music.videoSlotRect
      ? { top: music.videoSlotRect.top, left: music.videoSlotRect.left, width: music.videoSlotRect.width, height: music.videoSlotRect.height }
      : { top: 96, left: 16, right: 16, width: "calc(100vw - 32px)", height: "min(50vh, 360px)" };
    frameClassName += " z-30 rounded-2xl";
  } else if (music.expanded) {
    frameStyle = { top: 16, right: 16, width: "min(260px, 40vw)", height: "min(146px, 22vw)" };
    frameClassName += " z-30 rounded-2xl";
  } else {
    frameStyle = { bottom: 96, left: 16, width: 56, height: 56 };
    frameClassName += " z-30 rounded-2xl";
  }

  return (
    <>
      {/* El contenedor real del iframe siempre está montado, aunque no haya canción — así
          MenziDjContext puede crear el player la primera vez sin esperar un re-render. Con el
          panel de DJ Menzi abierto, el player se agranda a una esquina en vez de intentar encajar
          pixel a pixel dentro del sheet (que es centrado/de altura variable) — más simple y
          confiable que alinear un elemento fixed contra un modal cuya posición exacta no se
          conoce de antemano. */}
      <PlayerFrame setContainer={music.setPlayerContainer} style={frameStyle} className={frameClassName} />

      {hasTrack && music.videoHidden && (
        <div
          className="pointer-events-none fixed z-30 overflow-hidden rounded-2xl bg-[var(--color-background-deep,#07090D)]"
          style={frameStyle}
        />
      )}

      {hasTrack && music.fullscreen && (
        <button
          onClick={() => music.setFullscreen(false)}
          aria-label="Salir de pantalla completa"
          title="Salir de pantalla completa"
          className="fixed right-4 top-4 z-[96] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white"
        >
          <CloseIcon size={18} />
        </button>
      )}

      {hasTrack && !music.expanded && !music.fullscreen && (
        <button
          onClick={() => {
            if (music.videoHidden) {
              music.setVideoHidden(false);
              return;
            }
            if (live.activeRoomId) router.push(`/chat/${live.activeRoomId}`);
            music.setExpanded(true);
          }}
          className="fixed bottom-24 left-4 z-30 flex w-[220px] cursor-pointer items-center gap-2 rounded-full bg-[var(--color-surface-elevated)] py-1.5 pl-16 pr-2 text-left shadow-2xl ring-1 ring-[var(--color-border-strong)] md:bottom-6"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-cyan)]">
              <MenziDjBrand mode={music.session?.status === "playing" ? "playing" : "paused"} compact size={14} />
              DJ Menzi
            </div>
            <p className="truncate text-xs font-medium">
              {music.videoHidden ? "Video oculto · toca para mostrar" : music.session?.currentTitle || "Reproduciendo…"}
            </p>
          </div>
          {/* role="button" en vez de <button>: este pill entero ya es un <button> (línea 114 más
              arriba) y HTML no permite anidar <button>. tabIndex + onKeyDown replican Enter/Espacio
              a mano para que siga siendo operable solo con teclado. */}
          {!music.videoHidden && (live.myRole === "host" || live.myRole === "co_host") && (
            <span
              role="button"
              tabIndex={0}
              aria-label={music.session?.status === "playing" ? "Pausar" : "Reproducir"}
              onClick={(e) => {
                e.stopPropagation();
                if (music.session?.status === "playing") music.pauseTrack();
                else music.resumeTrack();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  if (music.session?.status === "playing") music.pauseTrack();
                  else music.resumeTrack();
                }
              }}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cyan)]"
            >
              {music.session?.status === "playing" ? <PauseIcon size={14} /> : <PlayIcon size={14} />}
            </span>
          )}
          {!music.videoHidden && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                music.toggleLocalMute();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  music.toggleLocalMute();
                }
              }}
              aria-label={music.localMuted ? "Activar música" : "Silenciar música"}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cyan)]"
            >
              {music.localMuted ? <VolumeMuteIcon size={14} /> : <VolumeIcon size={14} />}
            </span>
          )}
          {/* Apagado real (ver MenziDjContext.djEnabled) — antes la única forma de "quitar"
              Menzi DJ era `videoHidden`, que a propósito deja el audio sonando. Acá el usuario
              puede de verdad silenciarlo y volver a prenderlo cuando quiera. */}
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              music.toggleDjEnabled();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                music.toggleDjEnabled();
              }
            }}
            aria-label={music.djEnabled ? "Apagar Menzi DJ" : "Prender Menzi DJ"}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-cyan)] ${
              music.djEnabled
                ? "bg-[var(--color-surface-secondary)]"
                : "bg-[var(--color-cyan)] text-[var(--color-background-deep,#07090D)]"
            }`}
          >
            <PowerIcon size={14} />
          </span>
        </button>
      )}
    </>
  );
}
