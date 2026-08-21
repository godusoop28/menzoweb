"use client";

import { useRef, useState } from "react";

import { useAppState } from "@/lib/AppStateContext";

import { ImageIcon } from "./icons";

export function WallComposer({ profileId, placeholder }: { profileId: string; placeholder: string }) {
  const { actions } = useAppState();
  const [draft, setDraft] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [imageFile, setImageFile] = useState<File | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUri(URL.createObjectURL(file));
    setImageFile(file);
  }

  async function submit() {
    const trimmed = draft.trim();
    if ((!trimmed && !imageUri) || submitting) return;
    setSubmitting(true);
    try {
      await actions.addWallMessage(profileId, trimmed, imageUri, imageFile);
      setDraft("");
      setImageUri(undefined);
      setImageFile(undefined);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="menzo-panel flex flex-col gap-2 p-3">
      {imageUri && (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUri} alt="" className="h-16 w-16 rounded-lg object-cover" />
          <button
            onClick={() => {
              setImageUri(undefined);
              setImageFile(undefined);
            }}
            className="text-xs font-medium text-[var(--color-coral)] cursor-pointer"
          >
            Quitar imagen
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--color-text-muted)] cursor-pointer"
          aria-label="Adjuntar imagen"
        >
          <ImageIcon size={16} />
        </button>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
        />
        <button
          onClick={submit}
          disabled={(!draft.trim() && !imageUri) || submitting}
          className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-medium disabled:opacity-50 cursor-pointer"
        >
          Publicar
        </button>
      </div>
    </div>
  );
}
