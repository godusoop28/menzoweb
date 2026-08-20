"use client";

import { useState } from "react";

import { BlockEditor } from "./post/BlockEditor";
import { ApiError } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { useToast } from "@/lib/ToastContext";
import type { PostBlockDto } from "@/lib/api/types";

import { Avatar } from "./Avatar";
import { GradientButton } from "./GradientButton";
import { CloseIcon, ImageIcon } from "./icons";

type Mode = "text" | "image" | "poll" | "blog";

function hasRealContent(blocks: PostBlockDto[]) {
  return blocks.some(
    (b) => ((b.type === "paragraph" || b.type === "heading") && !!b.text?.trim()) || b.type === "image" || b.type === "gif"
  );
}

export function CreatePostComposer() {
  const { state, actions } = useAppState();
  const showToast = useToast();
  const [mode, setMode] = useState<Mode>("text");
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<PostBlockDto[]>([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [nsfw, setNsfw] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function commitTagDraft() {
    const next = tagDraft.trim().replace(/^#/, "").slice(0, 24);
    if (next && !tags.includes(next) && tags.length < 6) setTags((current) => [...current, next]);
    setTagDraft("");
  }

  const filledOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const valid = mode === "poll" ? pollQuestion.trim().length >= 3 && filledOptions.length >= 2 : hasRealContent(blocks);

  function reset() {
    setTitle("");
    setBlocks([]);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setNsfw(false);
    setTags([]);
    setTagDraft("");
    setMode("text");
  }

  async function handlePublish() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await actions.createPost({
        title: title.trim() || undefined,
        body: mode === "poll" ? pollQuestion.trim() : "",
        tags: mode === "poll" ? undefined : tags.length > 0 ? tags : undefined,
        pollOptions: mode === "poll" ? filledOptions : undefined,
        blocks: mode === "poll" ? undefined : blocks,
        postType: mode === "blog" ? "blog" : undefined,
        nsfw: mode === "blog" ? nsfw : undefined,
      });
      reset();
    } catch (error) {
      console.warn("[menzo/web] createPost failed", error);
      showToast(error instanceof ApiError ? error.message : "No se pudo publicar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="menzo-fade-in flex flex-col gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 shadow-[0_4px_18px_-8px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-3">
        {state.profile && (
          <Avatar
            name={state.profile.displayName}
            avatarUri={state.profile.avatarUri}
            gradient={state.profile.avatarGradient}
            size={38}
          />
        )}
        <p className="text-sm text-[var(--color-text-muted)]">
          ¿Qué tienes en mente{state.profile ? `, ${state.profile.displayName}` : ""}?
        </p>
      </div>

      <div className="flex gap-2 border-t border-[var(--color-border-soft)] pt-3">
        {(["text", "image", "blog", "poll"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer ${
              mode === m ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
            }`}
          >
            {m === "image" && <ImageIcon size={14} />}
            {m === "text" ? "Texto" : m === "image" ? "Imagen" : m === "blog" ? "Blog" : "Encuesta"}
          </button>
        ))}
      </div>

      {mode === "poll" ? (
        <>
          <textarea
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value.slice(0, 140))}
            placeholder="Escribe tu pregunta"
            rows={2}
            className="w-full resize-none rounded-xl bg-[var(--color-surface-secondary)] p-3 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          />
          <div className="flex flex-col gap-2">
            {pollOptions.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  value={option}
                  onChange={(e) =>
                    setPollOptions((current) => current.map((o, i) => (i === index ? e.target.value.slice(0, 60) : o)))
                  }
                  placeholder={`Opción ${index + 1}`}
                  className="flex-1 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
                />
                {pollOptions.length > 2 && (
                  <button
                    onClick={() => setPollOptions((current) => current.filter((_, i) => i !== index))}
                    className="text-[var(--color-text-muted)] cursor-pointer"
                    aria-label="Eliminar opción"
                  >
                    <CloseIcon size={18} />
                  </button>
                )}
              </div>
            ))}
            {pollOptions.length < 4 && (
              <button
                onClick={() => setPollOptions((current) => [...current, ""])}
                className="self-start text-xs font-medium text-[var(--color-cyan)] cursor-pointer"
              >
                + Añadir opción
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder={mode === "blog" ? "Título del blog" : "Título (opcional)"}
            className="w-full rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          />
          <BlockEditor blocks={blocks} onChange={setBlocks} />

          <div className="flex flex-wrap items-center gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs text-[var(--color-cyan)]"
              >
                #{tag}
                <button
                  onClick={() => setTags((current) => current.filter((t) => t !== tag))}
                  aria-label={`Quitar etiqueta ${tag}`}
                  className="cursor-pointer text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                >
                  <CloseIcon size={12} />
                </button>
              </span>
            ))}
            {tags.length < 6 && (
              <input
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commitTagDraft();
                  }
                }}
                onBlur={commitTagDraft}
                placeholder="Agregar etiqueta…"
                className="min-w-[110px] flex-1 bg-transparent px-1 py-1 text-xs outline-none placeholder:text-[var(--color-text-muted)]"
              />
            )}
          </div>

          {mode === "blog" && (
            <label className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <input
                type="checkbox"
                checked={nsfw}
                onChange={(e) => setNsfw(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[var(--color-coral)]"
              />
              Contenido para mayores de 18
            </label>
          )}
        </>
      )}

      <div className="self-end">
        <GradientButton
          label={mode === "poll" ? "Publicar encuesta" : "Publicar"}
          onClick={handlePublish}
          disabled={!valid}
          loading={submitting}
          gradient={mode === "poll" ? "creative" : "fire"}
          fullWidth={false}
          size="md"
        />
      </div>
    </div>
  );
}
