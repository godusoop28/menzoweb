import Link from "next/link";
import { useState } from "react";

import { Avatar } from "./Avatar";
import { ReplyIcon, TrashIcon } from "./icons";
import { useAccent } from "@/lib/AccentContext";
import { relativeTime } from "@/lib/time";
import { gradientCss } from "@/lib/theme";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import type { BubbleStyle, ChatAppearancePrefs } from "@/lib/chat/chatAppearance";
import type { RoomRole } from "@/lib/api/types";
import type { DemoUser, Message } from "@/lib/types";

const ROLE_BADGE: Partial<Record<RoomRole, string>> = { OWNER: "👑", CO_HOST: "⭐" };

/** `mode: "default"` devuelve `undefined` para que el llamador conserve exactamente el cálculo
 * de color que ya tenía (accent de comunidad / tinte de autor) — la apariencia personal solo
 * pisa ese comportamiento cuando el usuario eligió explícitamente un color o gradiente propio. */
function resolveBubbleBackground(style: BubbleStyle | undefined): string | undefined {
  if (!style || style.mode === "default") return undefined;
  if (style.mode === "solid") return style.color;
  if (style.mode === "gradient") return style.gradient;
  return undefined;
}

/** Mismo set fijo que menzomovil/_quickReactionEmojis — un puñado de reacciones rápidas, no un
 * selector completo de emojis (eso sería una feature aparte). */
const QUICK_REACTION_EMOJIS = ["❤️", "😂", "👍", "😮", "😢", "🙏"];

function ReactionChips({ message, onReact }: { message: Message; onReact?: (message: Message, emoji: string) => void }) {
  if (message.reactions.length === 0) return null;
  return (
    <div className={`flex flex-wrap gap-1.5 ${message.reactions.length ? "mt-1" : ""}`}>
      {message.reactions.map((reaction) => {
        const reactedByMe = reaction.userIds.includes(LOCAL_USER_ID);
        return (
          <button
            key={reaction.emoji}
            onClick={() => onReact?.(message, reaction.emoji)}
            disabled={!onReact}
            className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors cursor-pointer ${
              reactedByMe
                ? "border border-[var(--color-orange)] bg-[var(--color-orange)]/20"
                : "border border-transparent bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-secondary)]/70"
            }`}
          >
            <span>{reaction.emoji}</span>
            <span className="text-[var(--color-text-secondary)]">{reaction.count}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReactionPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} aria-hidden />
      <div className="absolute bottom-full z-20 mb-1 flex gap-1 rounded-full border border-[var(--color-border-soft)] bg-[var(--color-background)] px-2 py-1.5 shadow-lg">
        {QUICK_REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onPick(emoji)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
}

export function ChatBubble({
  message,
  author,
  isOwn,
  role,
  grouped,
  onReply,
  onReact,
  onDelete,
  appearance,
}: {
  message: Message;
  author?: DemoUser;
  isOwn: boolean;
  role?: RoomRole;
  /** true si el mensaje anterior es del mismo autor, mismo día, y hace poco — oculta avatar/nombre
   * repetidos para que la conversación se lea como una sola racha, no mensajes sueltos. */
  grouped?: boolean;
  /** Ausente (o el mensaje de sistema) → sin ícono de responder. Web no tiene un gesto de
   * long-press real como mobile, así que acá el ícono aparece al pasar el mouse (`group-hover`) —
   * en touch queda siempre tenue pero visible, sin necesitar un timer de long-press a mano. */
  onReply?: (message: Message) => void;
  /** Ausente (o mensaje de sistema) → sin botón de reaccionar. Abre un mini picker con
   * QUICK_REACTION_EMOJIS al pasar el mouse/tocar, igual criterio que onReply. */
  onReact?: (message: Message, emoji: string) => void;
  /** Presente cuando el llamador ya decidió que este usuario puede borrar este mensaje (autor
   * siempre; CURATOR+ para el de otros, ver chat/[id]/page.tsx) — el propio botón no vuelve a
   * chequear permisos. */
  onDelete?: (message: Message) => void;
  /** Apariencia personal del usuario que MIRA la sala (local, ver lib/chat/chatAppearance.ts) —
   * ausente = comportamiento idéntico al de antes de este prop. */
  appearance?: ChatAppearancePrefs;
}) {
  const accent = useAccent();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const bubbleOpacity = appearance?.bubbleOpacity ?? 1;
  const textScale = appearance?.textScale ?? 1;
  const compact = appearance?.compactMode ?? false;
  const showAvatars = appearance?.showAvatars ?? true;
  const outgoingBg = resolveBubbleBackground(appearance?.outgoingBubble);
  const incomingBg = resolveBubbleBackground(appearance?.incomingBubble);

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
          {message.body}
        </span>
      </div>
    );
  }

  // Sticker: sin fondo de burbuja, más grande — estilo WhatsApp/Telegram. Igual sigue mostrando
  // avatar/nombre/hora como cualquier otro mensaje, solo cambia el contenido central.
  if (message.type === "sticker" && message.sticker && !message.deleted) {
    return (
      <div
        className={`group flex max-w-[86%] items-end ${compact ? "gap-1.5" : "gap-2"} ${isOwn ? "ml-auto flex-row-reverse" : ""} ${grouped ? "mt-[-6px]" : ""}`}
      >
        {grouped || !showAvatars ? (
          <div className="w-[30px] shrink-0" aria-hidden />
        ) : author ? (
          <Link href={`/member/${author.id}`} className="shrink-0">
            <Avatar name={author.displayName} avatarUri={author.avatarUri} gradient={author.avatarGradient} size={30} level={author.level} />
          </Link>
        ) : (
          <Avatar name="?" gradient="fire" size={30} />
        )}
        <div className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={message.sticker.imageUrl} alt="" className="h-32 w-32 object-contain" />
          <ReactionChips message={message} onReact={onReact} />
          <span className={`text-[10px] ${isOwn ? "self-end" : ""} text-[var(--color-text-muted)]`}>
            {relativeTime(message.createdAt)}
          </span>
        </div>
        {onReact && (
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker((v) => !v)}
              aria-label="Reaccionar"
              title="Reaccionar"
              className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-sm opacity-40 transition-opacity cursor-pointer hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
            >
              🙂
            </button>
            {showReactionPicker && (
              <ReactionPicker
                onPick={(emoji) => {
                  onReact(message, emoji);
                  setShowReactionPicker(false);
                }}
                onClose={() => setShowReactionPicker(false)}
              />
            )}
          </div>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(message)}
            aria-label="Eliminar"
            title="Eliminar"
            className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] opacity-40 transition-opacity cursor-pointer hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <TrashIcon size={14} />
          </button>
        )}
      </div>
    );
  }

  const badge = role ? ROLE_BADGE[role] : undefined;
  // Cada persona tiene su propio color de burbuja (estilo Amino/Discord: la sala se siente viva,
  // no todo el mismo gris) — se deriva del mismo `avatarGradient` que ya pinta su avatar, como un
  // wash muy sutil de fondo más una franja sólida al costado, nunca opaco encima del texto.
  const authorTint = !isOwn && author ? gradientCss(author.avatarGradient) : undefined;

  const bubbleBackground = isOwn ? outgoingBg ?? accent.color : incomingBg;

  return (
    <div
      className={`group flex max-w-[86%] items-end ${compact ? "gap-1.5" : "gap-2"} ${isOwn ? "ml-auto flex-row-reverse" : ""} ${grouped ? "mt-[-6px]" : ""}`}
    >
      {grouped || !showAvatars ? (
        <div className="w-[30px] shrink-0" aria-hidden />
      ) : author ? (
        <Link href={`/member/${author.id}`} className="shrink-0">
          <Avatar name={author.displayName} avatarUri={author.avatarUri} gradient={author.avatarGradient} size={30} level={author.level} />
        </Link>
      ) : (
        <Avatar name="?" gradient="fire" size={30} />
      )}
      <div className={`flex min-w-0 flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
      <div
        className={`relative flex flex-col gap-1 overflow-hidden rounded-[20px] ${compact ? "px-3 py-1.5" : "px-4 py-2"} shadow-[0_2px_10px_-4px_rgba(0,0,0,0.4)] backdrop-blur-sm ${
          isOwn
            ? "rounded-tr-lg text-[var(--color-text-on-accent)]"
            : `rounded-tl-lg ${incomingBg ? "" : "border-l-[3px]"} bg-[var(--color-surface-secondary)]/90`
        }`}
        style={{
          background: bubbleBackground,
          opacity: bubbleOpacity,
          ...(!isOwn && !incomingBg && authorTint ? { borderLeftColor: authorTint } : {}),
        }}
      >
        {authorTint && !isOwn && !incomingBg && (
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.09]" style={{ background: authorTint }} aria-hidden />
        )}
        {!isOwn && !grouped && (
          <span
            className="flex items-center gap-1 text-xs font-bold text-[var(--color-cyan)]"
            style={textScale !== 1 ? { fontSize: `${12 * textScale}px` } : undefined}
          >
            {author ? (
              <Link href={`/member/${author.id}`} className="hover:underline">
                {author.displayName}
              </Link>
            ) : (
              "Miembro"
            )}
            {badge && <span aria-hidden>{badge}</span>}
          </span>
        )}
        {message.replyTo && (
          <div
            className={`flex flex-col gap-0.5 rounded-lg border-l-2 px-2 py-1 text-xs ${
              isOwn ? "border-black/30 bg-black/10" : "border-[var(--color-cyan)] bg-black/15"
            }`}
            style={textScale !== 1 ? { fontSize: `${12 * textScale}px` } : undefined}
          >
            {message.replyTo.deleted ? (
              <span className="italic text-[var(--color-text-muted)]">Mensaje eliminado</span>
            ) : (
              <>
                <span className="font-semibold">{message.replyTo.authorName}</span>
                <span className="truncate opacity-80">{message.replyTo.bodyPreview}</span>
              </>
            )}
          </div>
        )}
        {message.deleted ? (
          <p className={`text-sm italic ${isOwn ? "text-black/60" : "text-[var(--color-text-muted)]"}`}>Mensaje eliminado</p>
        ) : (
          <>
            {!!message.imageUri && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={message.imageUri} alt="" className="h-[150px] w-[200px] rounded-lg object-cover" />
            )}
            {!!message.body && (
              <p className="whitespace-pre-wrap text-sm" style={textScale !== 1 ? { fontSize: `${14 * textScale}px` } : undefined}>
                {message.body}
              </p>
            )}
          </>
        )}
        <span className={`self-end text-[10px] ${isOwn ? "text-black/60" : "text-[var(--color-text-muted)]"}`}>
          {relativeTime(message.createdAt)}
        </span>
      </div>
      <ReactionChips message={message} onReact={onReact} />
      </div>
      {!message.deleted && onReply && (
        <button
          onClick={() => onReply(message)}
          aria-label="Responder"
          title="Responder"
          className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] opacity-40 transition-opacity cursor-pointer hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <ReplyIcon size={14} />
        </button>
      )}
      {!message.deleted && onReact && (
        <div className="relative">
          <button
            onClick={() => setShowReactionPicker((v) => !v)}
            aria-label="Reaccionar"
            title="Reaccionar"
            className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-sm opacity-40 transition-opacity cursor-pointer hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
          >
            🙂
          </button>
          {showReactionPicker && (
            <ReactionPicker
              onPick={(emoji) => {
                onReact(message, emoji);
                setShowReactionPicker(false);
              }}
              onClose={() => setShowReactionPicker(false)}
            />
          )}
        </div>
      )}
      {!message.deleted && onDelete && (
        <button
          onClick={() => onDelete(message)}
          aria-label="Eliminar"
          title="Eliminar"
          className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] opacity-40 transition-opacity cursor-pointer hover:opacity-100 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <TrashIcon size={14} />
        </button>
      )}
    </div>
  );
}
