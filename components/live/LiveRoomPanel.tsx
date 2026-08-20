"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { IRemoteVideoTrack } from "agora-rtc-sdk-ng";

import { Avatar } from "@/components/Avatar";
import {
  ChatIcon,
  HandRaiseIcon,
  HeadsetIcon,
  HeadsetOffIcon,
  MicIcon,
  MicOffIcon,
  MinimizeIcon,
  MusicNoteIcon,
  ScreenShareIcon,
  SendIcon,
  SettingsIcon,
  TrashIcon,
  UsersIcon,
  VolumeIcon,
} from "@/components/icons";
import { MenziIllustrationState } from "@/components/illustrations/MenziIllustrationState";
import { RoomSettingsPanel } from "@/components/room/RoomSettingsPanel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Sheet } from "@/components/ui/Sheet";
import { ApiError, getMyRealId } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { useLiveRoomContext } from "@/lib/live/LiveRoomContext";
import { MenziDjPanel } from "@/components/music/MenziDjPanel";
import { DjMenziOrb } from "@/components/music/DjMenziOrb";
import { useMenziDjContext } from "@/lib/music/MenziDjContext";
import { useRoomSocket } from "@/lib/realtime/useRoomSocket";
import { findUser, messagesForRoom } from "@/lib/store/selectors";
import { useToast } from "@/lib/ToastContext";
import type { ChatRoom, LiveParticipant, LiveParticipantRole, Message } from "@/lib/types";

import { LiveParticipantBubble } from "./LiveParticipantBubble";

const STAGE_MODERATION_ROLES: LiveParticipantRole[] = ["speaker", "co_host"];

const STAGE_ROLES: LiveParticipantRole[] = ["host", "co_host", "speaker"];

function useElapsed(startedAt: string | null | undefined) {
  const [label, setLabel] = useState("00:00");
  useEffect(() => {
    if (!startedAt) return;
    const started = new Date(startedAt).getTime();
    function tick() {
      const seconds = Math.max(0, Math.floor((Date.now() - started) / 1000));
      const m = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
      const s = (seconds % 60).toString().padStart(2, "0");
      setLabel(`${m}:${s}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);
  return label;
}

/** La experiencia LIVE rediseñada: cabecera fija, escenario de participantes con jerarquía visual
 * (HOST > CO_HOSTS > SPEAKERS), anuncio tipo franja, audiencia agrupada abajo y controles según
 * el rol de quien mira. No destruye la conexión de Agora al minimizar — "minimizar" solo oculta
 * este overlay, el LiveRoomProvider sigue conectado (ver sección 26 del pedido). */
export function LiveRoomPanel({ room, onMinimize }: { room: ChatRoom; onMinimize: () => void }) {
  const live = useLiveRoomContext();
  const music = useMenziDjContext();
  const [showSettings, setShowSettings] = useState(false);
  const [showMusic, setShowMusic] = useState(false);
  const [showAudience, setShowAudience] = useState(false);
  const [moderationTarget, setModerationTarget] = useState<LiveParticipant | null>(null);
  const [volumeTarget, setVolumeTarget] = useState<LiveParticipant | null>(null);
  const myId = getMyRealId();
  const isConnectedHere = live.activeRoomId === room.id;
  const elapsed = useElapsed(live.watchedRoomId === room.id ? live.viewingState?.startedAt : undefined);

  // Chat con burbujas integrado (sección 26 del rediseño) — misma sala, mismo store/WebSocket que
  // el chat normal (ver app/(app)/chat/[id]/page.tsx): si esa página sigue montada debajo (el
  // LIVE se abre como overlay sobre ella, no como ruta aparte) ya tiene su propio useRoomSocket
  // activo para este roomId; se llama acá también por si el panel se abrió desde otro lado (p.
  // ej. LiveAutoplayBar) donde esa suscripción no existe. receiveRoomMessage dedupea por id en el
  // store global, así que dos suscripciones al mismo tópico nunca duplican un mensaje.
  const { state, actions } = useAppState();
  const showToast = useToast();
  useRoomSocket(isConnectedHere ? room.id : undefined);
  const chatMessages = useMemo(() => messagesForRoom(state.social, room.id), [state.social, room.id]);
  const [unreadChat, setUnreadChat] = useState(0);
  const [chatAtBottom, setChatAtBottom] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(chatMessages.length);

  useEffect(() => {
    if (chatMessages.length <= lastMessageCountRef.current) {
      lastMessageCountRef.current = chatMessages.length;
      return;
    }
    lastMessageCountRef.current = chatMessages.length;
    const el = chatScrollRef.current;
    const nearBottom = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) {
      requestAnimationFrame(() => el?.scrollTo({ top: el.scrollHeight }));
    } else {
      setUnreadChat((n) => n + 1);
    }
  }, [chatMessages.length]);

  function scrollChatToBottom() {
    setUnreadChat(0);
    setChatAtBottom(true);
    requestAnimationFrame(() => {
      const el = chatScrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }

  function handleChatScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setChatAtBottom(atBottom);
    if (atBottom && unreadChat > 0) setUnreadChat(0);
  }

  const [chatDraft, setChatDraft] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  async function sendChat() {
    const text = chatDraft.trim();
    if (!text || sendingChat) return;
    setChatDraft("");
    setSendingChat(true);
    try {
      await actions.sendMessage(room.id, text);
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos enviar tu mensaje.");
    } finally {
      setSendingChat(false);
    }
  }

  /** "Reacciones" del control bar — no existe un canal de reacciones efímeras propio en el
   * backend de LIVE (ver LiveService), así que se adapta usando lo que SÍ es real: el mismo chat
   * de la sala de arriba, con un emoji como cuerpo del mensaje. Aparece como un mensaje más en
   * `chatMessages` (viene del mismo store global, ver arriba), nunca un overlay flotante fake. */
  async function sendReaction(emoji: string) {
    try {
      await actions.sendMessage(room.id, emoji);
    } catch {
      showToast("No pudimos enviar tu reacción.");
    }
  }

  const stage = isConnectedHere ? live.participants.filter((p) => STAGE_ROLES.includes(p.role)) : [];
  const audience = isConnectedHere ? live.participants.filter((p) => !STAGE_ROLES.includes(p.role)) : [];
  const announcement = live.watchedRoomId === room.id ? live.viewingState?.announcement : room.liveSummary?.announcement;
  const title = (live.watchedRoomId === room.id ? live.viewingState?.title : room.liveSummary?.title) || room.name;
  // Antes usaba room.liveSummary?.participantCount para cualquiera que no estuviera conectado al
  // audio — ese valor viene del fetch inicial de la lista de salas y nunca se actualiza solo, así
  // que alguien mirando este panel sin unirse todavía veía un número pegado hasta refrescar.
  // live.viewingState sí se mantiene al día vía WebSocket (ver watchRoom en LiveRoomContext).
  const total = isConnectedHere
    ? live.participants.length
    : live.watchedRoomId === room.id
      ? live.viewingState?.participantCount ?? 0
      : room.liveSummary?.participantCount ?? 0;
  const canModerate = room.role === "owner" || room.role === "co_host";

  const backgroundImage = room.coverUri || room.backgroundUri;

  return (
    <div className="fixed inset-0 z-40 flex flex-col overflow-hidden" style={{ background: "var(--color-background-deep, #030509)" }}>
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: backgroundImage
            ? `linear-gradient(rgba(3,5,9,0.55), rgba(3,5,9,0.85)), url(${backgroundImage})`
            : "linear-gradient(160deg, #1a0f2e, #07090D 60%)",
          filter: backgroundImage ? "blur(2px)" : undefined,
        }}
        aria-hidden
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--color-background)] to-transparent" aria-hidden />

      {/* En desktop ancho (lg:+) se abre en dos zonas: columna central de ancho máximo (stage) +
          rail lateral persistente de audiencia (ver <aside> más abajo) — en angosto se mantiene
          exactamente el layout vertical de siempre, audiencia incluida como tira colapsable. */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row lg:gap-3 lg:px-3 lg:pb-3">
      <div className="flex min-h-0 flex-1 flex-col lg:mx-auto lg:w-full lg:max-w-[720px]">
        {/* Cabecera fija — barra de vidrio en vez de flotar directo sobre el fondo, mismo
            lenguaje visual que la barra de controles de abajo. */}
        <div className="mx-3 mt-3 flex shrink-0 items-center gap-2.5 rounded-2xl border border-white/10 bg-black/35 px-3.5 py-2.5 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md">
          <span className="flex items-center gap-1 rounded-full bg-[var(--color-coral)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_0_12px_-2px_var(--color-coral)]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden />
            Live
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="text-[11px] text-[var(--color-text-muted)]">
              {total} personas · {elapsed}
            </p>
          </div>
          {canModerate && (
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Configuración del LIVE"
              title="Configuración del LIVE"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white cursor-pointer transition-colors hover:bg-white/20"
            >
              <SettingsIcon size={17} />
            </button>
          )}
          <button
            onClick={onMinimize}
            aria-label="Minimizar"
            title="Minimizar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white cursor-pointer transition-colors hover:bg-white/20"
          >
            <MinimizeIcon size={17} />
          </button>
        </div>

        {announcement && (
          <div className="mx-3 mb-2 mt-2 flex shrink-0 items-start gap-2 rounded-2xl border border-white/10 bg-black/35 px-3.5 py-2.5 text-xs shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md">
            <span aria-hidden>📣</span>
            <p className="line-clamp-2">{announcement}</p>
          </div>
        )}

        {/* Escenario — ya no reclama todo el espacio disponible (antes era flex-1, así que un
            LIVE con pocos hablantes dejaba un vacío enorme entre las burbujas y los controles,
            sección 25 del rediseño): se acota a un alto máximo y deja el resto para el chat de
            abajo. */}
        <div className="max-h-[38vh] shrink-0 overflow-y-auto px-4 pb-2">
          {!isConnectedHere ? (
            <div className="flex h-full flex-col items-center justify-center">
              <MenziIllustrationState
                image="/illustrations/menzi/menzi-live-voice.webp"
                alt=""
                description={live.connecting ? "Conectando…" : "Conectate para escuchar este LIVE."}
                size="medium"
                action={!live.connecting ? { label: "Escuchar", onClick: () => live.join(room.id) } : undefined}
              />
            </div>
          ) : (
            <>
              {live.remoteScreenTrack && <ScreenShareSurface track={live.remoteScreenTrack} />}
              {music.session?.currentVideoId && (
                <div className="flex justify-center py-2">
                  <DjMenziOrb
                    playing={music.session.status === "playing"}
                    voiceLevel={live.speakingLevels.size > 0 ? Math.max(...live.speakingLevels.values()) : 0}
                    title={music.session.currentTitle}
                    onClick={() => setShowMusic(true)}
                  />
                </div>
              )}
              <div className="grid grid-cols-3 gap-x-2 gap-y-4 py-2 sm:grid-cols-4 md:grid-cols-5">
                {stage.map((p) => (
                  <StageSlot
                    key={p.user.id}
                    participant={p}
                    speakingLevel={live.speakingLevels.get(p.user.id) ?? 0}
                    onModerate={canModerate && p.user.id !== myId ? () => setModerationTarget(p) : undefined}
                    onOpenVolumeControl={p.user.id !== myId ? () => setVolumeTarget(p) : undefined}
                    locallyMuted={live.localMutedUserIds.has(p.user.id)}
                    localVolume={live.localVolumes.get(p.user.id) ?? 100}
                  />
                ))}
                {stage.length === 0 && (
                  <div className="col-span-full flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-black/20 py-8 backdrop-blur-sm">
                    <span className="text-2xl" aria-hidden>🎙️</span>
                    <p className="text-sm text-[var(--color-text-muted)]">Nadie está hablando todavía.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Audiencia — tira colapsable, solo <lg. En lg:+ la misma lista vive en el rail lateral
            persistente de abajo (<aside>), sin togglear. */}
        {isConnectedHere && (
          <div className="shrink-0 px-4 pb-1 lg:hidden">
            <button
              onClick={() => setShowAudience((v) => !v)}
              className="mb-1.5 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-[var(--color-text-muted)] backdrop-blur-sm cursor-pointer transition-colors hover:bg-black/40"
            >
              <UsersIcon size={13} /> Escuchando ({audience.length}) {showAudience ? "▲" : "▼"}
            </button>
            {showAudience && (
              <div className="flex max-h-28 flex-wrap gap-x-3 gap-y-2 overflow-y-auto">
                <AudienceGrid audience={audience} />
              </div>
            )}
          </div>
        )}

        {/* Chat con burbujas integrado (sección 26 del rediseño) — nunca abre una pantalla
            aparte, vive en el espacio que deja libre el escenario de arriba. Mismos mensajes que
            el chat normal de la sala (ver useRoomSocket/messagesForRoom más arriba), solo otra
            vista sobre ellos. */}
        {isConnectedHere && (
          <div className="mx-3 mb-2 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md">
            <div ref={chatScrollRef} onScroll={handleChatScroll} className="min-h-0 flex-1 overflow-y-auto px-3.5 py-2.5">
              {chatMessages.length === 0 ? (
                <p className="py-4 text-center text-xs text-[var(--color-text-muted)]">Sé el primero en escribir en este LIVE.</p>
              ) : (
                chatMessages.map((m) => <LiveChatBubble key={m.id} message={m} author={findUser(state.social, m.authorId)} />)
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChat();
              }}
              className="flex shrink-0 items-center gap-2 border-t border-white/10 px-3 py-2.5"
            >
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Enviar mensaje…"
                className="min-w-0 flex-1 rounded-full bg-white/5 px-3.5 py-2 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
              />
              <button
                type="submit"
                disabled={!chatDraft.trim() || sendingChat}
                aria-label="Enviar"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-orange)] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SendIcon size={16} />
              </button>
            </form>
          </div>
        )}

        {/* Controles inferiores */}
        {isConnectedHere && (
          <LiveControls
            room={room}
            unreadChat={chatAtBottom ? 0 : unreadChat}
            onOpenChat={scrollChatToBottom}
            onSendReaction={sendReaction}
            onOpenSettings={() => setShowSettings(true)}
            onOpenMusic={() => setShowMusic(true)}
            onExit={onMinimize}
          />
        )}
      </div>

      {/* Rail lateral persistente de audiencia — solo lg:+ (stage central + panel lateral
          plegable de la spec de rediseño, sección 8/13). En <lg no se renderiza: la misma lista
          vive en la tira colapsable de arriba. */}
      {isConnectedHere && (
        <aside className="hidden shrink-0 flex-col gap-3 lg:flex lg:w-72">
          <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/25 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md">
            <div className="flex shrink-0 items-center gap-1.5 border-b border-white/10 px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text-muted)]">
              <UsersIcon size={13} /> Escuchando ({audience.length})
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                <AudienceGrid audience={audience} />
              </div>
            </div>
          </div>

          {!!music.session?.queue.length && (
            <div className="shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/25 shadow-[0_8px_24px_-10px_rgba(0,0,0,0.6)] backdrop-blur-md">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-3.5 py-2.5 text-xs font-semibold text-[var(--color-text-muted)]">
                <MusicNoteIcon size={13} /> En la cola ({music.session.queue.length})
              </div>
              <div className="flex flex-col gap-2 p-3">
                {music.session.queue.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center gap-2.5">
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="h-10 w-10 shrink-0 rounded-lg bg-gradient-to-br from-[#402460] to-[#182b44]" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{item.title}</p>
                      <p className="truncate text-[10px] text-[var(--color-text-muted)]">{item.channelTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowMusic(true)}
                className="w-full border-t border-white/10 px-3.5 py-2.5 text-center text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer hover:bg-white/5"
              >
                Ver toda la cola
              </button>
            </div>
          )}
        </aside>
      )}
      </div>

      {showMusic && <MenziDjPanel room={room} onClose={() => setShowMusic(false)} />}

      {showSettings && <RoomSettingsPanel room={room} onClose={() => setShowSettings(false)} initialTab="live" />}

      <ParticipantModerationSheet target={moderationTarget} onClose={() => setModerationTarget(null)} />

      <ParticipantVolumeSheet target={volumeTarget} onClose={() => setVolumeTarget(null)} />
    </div>
  );
}

/** Burbuja compacta del chat inline del LIVE — sección 26 del rediseño: "avatar, nombre + title,
 * hora, mensaje". Vista deliberadamente más simple que <ChatBubble/> (sin replies/reacciones/
 * apariencia personal): este panel es un complemento del audio, no un reemplazo del chat de
 * sala completo, que sigue viviendo en su propia pantalla con todas esas capacidades. */
function LiveChatBubble({ message, author }: { message: Message; author: ReturnType<typeof findUser> }) {
  if (message.type === "system") {
    return <p className="py-1 text-center text-xs text-[var(--color-text-muted)]">{message.body}</p>;
  }
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className="flex items-start gap-2 py-1">
      <Avatar name={author?.displayName ?? "?"} avatarUri={author?.avatarUri} gradient={author?.avatarGradient ?? "fire"} size={26} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate text-xs font-bold text-[var(--color-accent,var(--color-orange))]">{author?.displayName ?? "?"}</span>
          <span className="shrink-0 text-[10px] text-[var(--color-text-muted)]">{time}</span>
        </div>
        <div className="mt-0.5 inline-block rounded-xl bg-black/35 px-2.5 py-1.5 text-sm">
          {message.deleted ? <span className="text-[var(--color-text-muted)]">Mensaje eliminado</span> : message.body}
        </div>
      </div>
    </div>
  );
}

/** Grilla de burbujas chicas de audiencia — compartida entre la tira colapsable (móvil/tablet) y
 * el rail lateral persistente (desktop ancho, ver LiveRoomPanel) para no duplicar el JSX de cada
 * burbuja en los dos lugares donde se muestra la misma lista. */
function AudienceGrid({ audience }: { audience: LiveParticipant[] }) {
  if (audience.length === 0) {
    return <p className="text-xs text-[var(--color-text-muted)]">Nadie más está escuchando todavía.</p>;
  }
  return (
    <>
      {audience.map((p) => (
        <div key={p.user.id} className="flex flex-col items-center gap-1">
          {/* La audiencia (roles "audience"/"requested") no tiene acciones de mute/bajar del
              escenario — esas solo aplican a quien YA está hablando (host/co_host/speaker, ver
              `stage` en LiveRoomPanel). Aprobar/rechazar solicitudes para hablar vive en
              RoomSettingsPanel → SpeakingRequestsList, no acá. */}
          <LiveParticipantBubble participant={p} size={36} speakingLevel={0} />
        </div>
      ))}
    </>
  );
}

/** Conecta demoteParticipant/muteParticipant/removeParticipant — ya existían en
 * LiveRoomContext (ver lib/live/LiveRoomContext.tsx) pero ninguna UI los llamaba todavía; en
 * menzomovil el equivalente ya existe (_ParticipantModTile en live_room_panel.dart), mismos tres
 * verbos con el mismo significado: "Silenciar" (mute forzado), "Bajar del escenario" (retirar del
 * chat de voz sin sacarlo del LIVE — vuelve a audience, puede volver a solicitar hablar) y
 * "Expulsar" (kick real, marca al participante como retirado del LIVE). El backend vuelve a
 * validar todos los permisos — esto es solo la UI, nunca la única barrera (ver sección 19). */
function ParticipantModerationSheet({ target, onClose }: { target: LiveParticipant | null; onClose: () => void }) {
  const live = useLiveRoomContext();
  const showToast = useToast();
  const [busy, setBusy] = useState<"mute" | "demote" | "remove" | null>(null);

  async function run(action: "mute" | "demote" | "remove") {
    if (!target) return;
    setBusy(action);
    try {
      if (action === "mute") await live.muteParticipant(target.user.id);
      else if (action === "demote") await live.demoteParticipant(target.user.id);
      else await live.removeParticipant(target.user.id);
      onClose();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos completar esa acción de moderación.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={!!target} onClose={onClose} title={target?.user.displayName ?? ""} subtitle="Moderación del chat de voz" widthClassName="max-w-sm">
      <div className="flex flex-col gap-2">
        <button
          onClick={() => run("mute")}
          disabled={busy !== null}
          className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-secondary)] px-4 py-3 text-sm font-medium cursor-pointer disabled:opacity-60"
        >
          <MicOffIcon size={16} /> Silenciar micrófono
        </button>
        {target && STAGE_MODERATION_ROLES.includes(target.role) && (
          <button
            onClick={() => run("demote")}
            disabled={busy !== null}
            className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-secondary)] px-4 py-3 text-sm font-medium cursor-pointer disabled:opacity-60"
          >
            <UsersIcon size={16} /> Retirar del chat de voz
          </button>
        )}
        <button
          onClick={() => run("remove")}
          disabled={busy !== null}
          className="flex items-center gap-3 rounded-xl bg-[var(--color-coral)]/15 px-4 py-3 text-sm font-medium text-[var(--color-coral)] cursor-pointer disabled:opacity-60"
        >
          <TrashIcon size={16} /> Expulsar del LIVE
        </button>
      </div>
    </Sheet>
  );
}

/** Volumen/silencio LOCAL de un participante — nunca pega al backend ni afecta lo que escuchan
 * los demás (ver LiveRoomContext.setLocalParticipantVolume/toggleLocalParticipantMute). A
 * diferencia de ParticipantModerationSheet, disponible para cualquiera, no solo moderadores. */
function ParticipantVolumeSheet({ target, onClose }: { target: LiveParticipant | null; onClose: () => void }) {
  const live = useLiveRoomContext();
  if (!target) return null;
  const muted = live.localMutedUserIds.has(target.user.id);
  const volume = live.localVolumes.get(target.user.id) ?? 100;

  return (
    <Sheet open={!!target} onClose={onClose} title={target.user.displayName} subtitle="Volumen local" widthClassName="max-w-sm">
      <div className="flex flex-col gap-4">
        <p className="text-xs text-[var(--color-text-muted)]">Solo para vos — no cambia lo que escuchan los demás.</p>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-secondary)] px-4 py-3 text-sm font-medium cursor-pointer">
          Ensordecer
          <input
            type="checkbox"
            checked={muted}
            onChange={() => live.toggleLocalParticipantMute(target.user.id)}
            className="h-5 w-5 cursor-pointer accent-[var(--color-coral)]"
          />
        </label>
        <div className="flex items-center gap-3">
          <VolumeIcon size={16} className="shrink-0 text-[var(--color-text-muted)]" />
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={volume}
            disabled={muted}
            onChange={(e) => live.setLocalParticipantVolume(target.user.id, Number(e.target.value))}
            className="w-full cursor-pointer accent-[var(--color-orange)] disabled:cursor-not-allowed disabled:opacity-50"
          />
          <span className="w-10 shrink-0 text-right text-xs text-[var(--color-text-muted)]">{muted ? 0 : volume}%</span>
        </div>
      </div>
    </Sheet>
  );
}

/** Superficie de video para la pantalla compartida — Discord no la usa como "toma total" de la
 * pantalla, sigue mostrando el resto (escenario, audiencia) debajo; acá se hace lo mismo, es un
 * elemento más arriba del escenario, no un modo aparte. `track.play(el)` es imperativo (Agora
 * pinta directo en el DOM node, no vía React), así que va en un efecto — nunca se guarda el
 * elemento en el store ni se re-renderiza el video en cada cambio de estado del panel. */
function ScreenShareSurface({ track }: { track: IRemoteVideoTrack }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    track.play(el);
    return () => {
      track.stop();
    };
  }, [track]);

  return (
    <div className="mb-2 aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-lg">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

function StageSlot({
  participant,
  speakingLevel,
  onModerate,
  onOpenVolumeControl,
  locallyMuted,
  localVolume,
}: {
  participant: LiveParticipant;
  speakingLevel: number;
  onModerate?: (participant: LiveParticipant) => void;
  onOpenVolumeControl?: (participant: LiveParticipant) => void;
  locallyMuted?: boolean;
  localVolume?: number;
}) {
  const isHost = participant.role === "host";
  return (
    <LiveParticipantBubble
      participant={participant}
      size={isHost ? 76 : 60}
      speakingLevel={speakingLevel}
      onModerate={onModerate}
      onOpenVolumeControl={onOpenVolumeControl}
      locallyMuted={locallyMuted}
      localVolume={localVolume}
    />
  );
}

type ControlVariant = "neutral" | "on" | "danger";

const VARIANT_CLASSES: Record<ControlVariant, string> = {
  neutral: "bg-white/10 hover:bg-white/20 text-white",
  // Estado "encendido/normal" del micrófono — deliberadamente sutil, no debe competir visualmente
  // con el estado silenciado (que sí necesita saltar a la vista, ver "danger" abajo).
  on: "bg-white/10 hover:bg-white/20 text-white",
  // Silenciado (o cualquier acción que corte la llamada) siempre en coral: es el único estado que
  // realmente necesita llamar la atención acá.
  danger: "bg-[var(--color-coral)] text-white hover:brightness-110",
};

function ControlButton({
  onClick,
  label,
  variant = "neutral",
  disabled,
  badge,
  children,
}: {
  onClick: () => void;
  label: string;
  variant?: ControlVariant;
  disabled?: boolean;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`relative flex h-12 w-12 items-center justify-center rounded-full cursor-pointer transition-colors disabled:cursor-wait disabled:opacity-70 ${VARIANT_CLASSES[variant]}`}
    >
      {children}
      {!!badge && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-coral)] px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

const QUICK_REACTION_EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🙏"];

function LiveControls({
  room,
  unreadChat,
  onOpenChat,
  onSendReaction,
  onOpenSettings,
  onOpenMusic,
  onExit,
}: {
  room: ChatRoom;
  unreadChat: number;
  onOpenChat: () => void;
  onSendReaction: (emoji: string) => void;
  onOpenSettings: () => void;
  onOpenMusic: () => void;
  onExit: () => void;
}) {
  const live = useLiveRoomContext();
  const showToast = useToast();
  const [confirmEndForAll, setConfirmEndForAll] = useState(false);
  const [endingForAll, setEndingForAll] = useState(false);
  const [screenShareBusy, setScreenShareBusy] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const canModerate = room.role === "owner" || room.role === "co_host";
  const myId = getMyRealId();
  const someoneElseSharing = live.participants.some((p) => p.screenSharing && p.user.id !== myId);

  async function handleToggleScreenShare() {
    if (screenShareBusy) return;
    setScreenShareBusy(true);
    try {
      if (live.screenSharing) await live.stopScreenShare();
      else await live.startScreenShare();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos compartir tu pantalla.");
    } finally {
      setScreenShareBusy(false);
    }
  }

  // Única fuente de errores de micrófono (ver LiveRoomContext) — cualquier falla, sea al
  // publicar el track o al alternar mute, termina acá como un toast legible en vez de un botón
  // que simplemente no responde.
  useEffect(() => {
    if (live.lastMicrophoneError) showToast(live.lastMicrophoneError);
  }, [live.lastMicrophoneError, showToast]);

  async function handleRequestToSpeak() {
    try {
      await live.requestToSpeak();
    } catch {
      showToast("No pudimos enviar tu solicitud.");
    }
  }

  /** "Salir" es personal: me desconecto y cierro el panel, pero el LIVE sigue para los demás. */
  async function handleExit() {
    await live.leave();
    onExit();
  }

  /** "Finalizar LIVE" corta la llamada para TODOS — pide confirmación aparte porque no se puede
   * deshacer y afecta a cualquiera que esté escuchando en ese momento. */
  async function handleEndForAll() {
    if (endingForAll) return;
    setEndingForAll(true);
    try {
      await live.endLive(room.id);
      setConfirmEndForAll(false);
      onExit();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos finalizar el LIVE.");
    } finally {
      setEndingForAll(false);
    }
  }

  return (
    <>
      <div
        className="mx-3 mb-3 flex shrink-0 flex-wrap items-center justify-center gap-3 rounded-3xl border border-white/10 bg-black/35 px-4 py-3.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.65)] backdrop-blur-md"
        style={{ marginBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
      >
        {live.canSpeak && (
          <ControlButton
            onClick={live.toggleMute}
            disabled={live.microphoneChanging}
            label={
              !live.localAudioPublished
                ? "Reintentar micrófono"
                : live.muted
                  ? "Activar micrófono"
                  : "Silenciar micrófono"
            }
            variant={live.muted || !live.localAudioPublished ? "danger" : "on"}
          >
            {live.muted || !live.localAudioPublished ? <MicOffIcon size={18} /> : <MicIcon size={18} />}
          </ControlButton>
        )}
        <ControlButton
          onClick={live.toggleDeafen}
          label={live.deafened ? "Reactivar audio" : "Auriculares"}
          variant={live.deafened ? "danger" : "neutral"}
        >
          {live.deafened ? <HeadsetOffIcon size={18} /> : <HeadsetIcon size={18} />}
        </ControlButton>
        {live.myRole === "audience" && (
          <button
            onClick={handleRequestToSpeak}
            className="flex h-12 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white cursor-pointer hover:bg-white/20"
          >
            <HandRaiseIcon size={16} /> Solicitar hablar
          </button>
        )}
        {live.myRole === "requested" && (
          <button
            onClick={() => live.cancelSpeakRequest()}
            className="flex h-12 items-center gap-2 rounded-full bg-[var(--color-yellow)]/20 px-4 text-sm font-semibold text-[var(--color-yellow)] cursor-pointer"
          >
            <HandRaiseIcon size={16} /> Solicitud enviada · Cancelar
          </button>
        )}
        <div className="relative">
          {showReactions && (
            <>
              {/* Cierra el popover al tocar afuera — capa invisible detrás, mismo patrón que
                  Sheet/dropdown del resto de la app. */}
              <div className="fixed inset-0 z-10" onClick={() => setShowReactions(false)} />
              <div className="absolute bottom-full left-1/2 z-20 mb-2 flex -translate-x-1/2 gap-1.5 rounded-2xl border border-white/10 bg-[#0d1722] p-2 shadow-xl">
                {QUICK_REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onSendReaction(emoji);
                      setShowReactions(false);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-white/10 cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
          <ControlButton onClick={() => setShowReactions((v) => !v)} label="Reacciones" variant={showReactions ? "on" : "neutral"}>
            <span aria-hidden className="text-base leading-none">
              ☺
            </span>
          </ControlButton>
        </div>
        <ControlButton onClick={onOpenChat} label="Mensajes" badge={unreadChat}>
          <ChatIcon size={18} />
        </ControlButton>
        <ControlButton onClick={onOpenMusic} label="DJ Menzi">
          <MusicNoteIcon size={18} />
        </ControlButton>
        {canModerate && (
          <ControlButton
            onClick={handleToggleScreenShare}
            disabled={screenShareBusy || (!live.screenSharing && someoneElseSharing)}
            label={
              live.screenSharing
                ? "Dejar de compartir pantalla"
                : someoneElseSharing
                  ? "Alguien más está compartiendo pantalla"
                  : "Compartir pantalla"
            }
            variant={live.screenSharing ? "on" : "neutral"}
          >
            <ScreenShareIcon size={18} />
          </ControlButton>
        )}
        {canModerate && (
          <ControlButton onClick={onOpenSettings} label="Solicitudes y moderación">
            <UsersIcon size={18} />
          </ControlButton>
        )}
        {canModerate && (
          <button
            onClick={() => setConfirmEndForAll(true)}
            className="flex h-12 items-center gap-2 rounded-full bg-[var(--color-coral)] px-4 text-sm font-bold text-white cursor-pointer hover:brightness-110"
          >
            📞 Finalizar LIVE
          </button>
        )}
        <button
          onClick={handleExit}
          className="flex h-12 items-center gap-2 rounded-full bg-white/10 px-4 text-sm font-semibold text-white cursor-pointer hover:bg-white/20"
        >
          Salir
        </button>
      </div>

      <ConfirmDialog
        open={confirmEndForAll}
        title="Finalizar LIVE para todos"
        description="Se cortará la llamada para todas las personas que están escuchando ahora mismo. No se puede deshacer."
        confirmLabel="Finalizar para todos"
        busy={endingForAll}
        danger
        onConfirm={handleEndForAll}
        onCancel={() => setConfirmEndForAll(false)}
      />
    </>
  );
}
