"use client";

import { useState } from "react";

import { BlockEditor } from "./post/BlockEditor";
import { ApiError } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { useToast } from "@/lib/ToastContext";
import type { PostBlockDto } from "@/lib/api/types";

import { GradientButton } from "./GradientButton";
import { CloseIcon } from "./icons";

type Mode = "text" | "image" | "poll";

function hasRealContent(blocks: PostBlockDto[]) {
  return blocks.some(
    (b) => ((b.type === "paragraph" || b.type === "heading") && !!b.text?.trim()) || b.type === "image" || b.type === "gif"
  );
}

export function CreatePostComposer() {
  const { actions } = useAppState();
  const showToast = useToast();
  const [mode, setMode] = useState<Mode>("text");
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<PostBlockDto[]>([]);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  const filledOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const valid = mode === "poll" ? pollQuestion.trim().length >= 3 && filledOptions.length >= 2 : hasRealContent(blocks);

  function reset() {
    setTitle("");
    setBlocks([]);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setMode("text");
  }

  async function handlePublish() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await actions.createPost({
        title: title.trim() || undefined,
        body: mode === "poll" ? pollQuestion.trim() : "",
        pollOptions: mode === "poll" ? filledOptions : undefined,
        blocks: mode === "poll" ? undefined : blocks,
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
      <div className="flex gap-2">
        {(["text", "image", "poll"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium cursor-pointer ${
              mode === m ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]" : "bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)]"
            }`}
          >
            {m === "text" ? "Texto" : m === "image" ? "Imagen" : "Encuesta"}
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
            placeholder="Título (opcional)"
            className="w-full rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          />
          <BlockEditor blocks={blocks} onChange={setBlocks} />
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
