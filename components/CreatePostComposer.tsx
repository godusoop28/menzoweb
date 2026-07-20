"use client";

import { useRef, useState } from "react";

import { useAppState } from "@/lib/AppStateContext";

import { GradientButton } from "./GradientButton";
import { CloseIcon, ImageIcon } from "./icons";

type Mode = "text" | "image" | "poll";

export function CreatePostComposer() {
  const { actions } = useAppState();
  const [mode, setMode] = useState<Mode>("text");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filledOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const valid = mode === "poll" ? body.trim().length >= 3 && filledOptions.length >= 2 : body.trim().length > 0;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUri(URL.createObjectURL(file));
    setImageFile(file);
  }

  function reset() {
    setTitle("");
    setBody("");
    setImageUri(undefined);
    setImageFile(undefined);
    setPollOptions(["", ""]);
    setMode("text");
  }

  async function handlePublish() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await actions.createPost({
        title: title.trim() || undefined,
        body: body.trim(),
        imageUri: mode === "image" ? imageUri : undefined,
        imageFile: mode === "image" ? imageFile : undefined,
        pollOptions: mode === "poll" ? filledOptions : undefined,
      });
      reset();
    } catch (error) {
      console.warn("[menzo/web] createPost failed", error);
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
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 140))}
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
          {mode === "image" && (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 80))}
              placeholder="Título (opcional)"
              className="w-full rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
            />
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 600))}
            placeholder="¿Qué recuerdo quieres compartir?"
            rows={3}
            className="w-full resize-none rounded-xl bg-[var(--color-surface-secondary)] p-3 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          />
          {mode === "image" &&
            (imageUri ? (
              <div className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUri} alt="" className="max-h-56 w-full rounded-xl object-cover" />
                <button
                  onClick={() => {
                    setImageUri(undefined);
                    setImageFile(undefined);
                  }}
                  className="self-start text-xs font-medium text-[var(--color-coral)] cursor-pointer"
                >
                  Quitar imagen
                </button>
              </div>
            ) : (
              <>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 self-start rounded-full border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer"
                >
                  <ImageIcon size={16} />
                  Añadir imagen
                </button>
              </>
            ))}
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
