"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { ApiError, stickersApi, uploadsApi } from "@/lib/api";
import { BackIcon, CloseIcon, PlusIcon } from "@/components/icons";

type Draft = { file: File; previewUrl: string };

/** Cualquier usuario logueado puede crear un pack — se vuelve público y usable por cualquier
 * otro en el instante en que se crea, sin paso de "agregar a mi bandeja" (ver StickerService). */
export default function CreateStickerPackPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files).map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setDrafts((prev) => [...prev, ...next].slice(0, 30));
  }

  function removeDraft(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  async function save() {
    if (!name.trim() || drafts.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const imageUrls = await Promise.all(drafts.map((d) => uploadsApi.upload(d.file)));
      await stickersApi.createPack({ name: name.trim(), imageUrls });
      // Volver a donde estaba (típicamente el picker de stickers del chat, ver
      // StickerPickerSheet) en vez de una ruta fija — el pack ya quedó público y usable de
      // inmediato, no hace falta "abrirlo" para nada más.
      router.back();
    } catch (err) {
      console.warn("[menzo/web] createStickerPack failed", err);
      setError(err instanceof ApiError ? err.message : "No pudimos crear el pack — probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[var(--color-text-secondary)] cursor-pointer">
          <BackIcon />
        </button>
        <h1 className="font-display text-xl font-bold">Nuevo pack de stickers</h1>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del pack"
        maxLength={60}
        className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 text-sm outline-none focus:border-[var(--color-coral)]"
      />

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {drafts.map((draft, index) => (
          <div key={draft.previewUrl} className="relative aspect-square overflow-hidden rounded-xl bg-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={draft.previewUrl} alt="" className="h-full w-full object-contain" />
            <button
              onClick={() => removeDraft(index)}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white cursor-pointer"
              aria-label="Quitar"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ))}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--color-border-strong)] text-[var(--color-text-muted)] cursor-pointer"
        >
          <PlusIcon size={20} />
          <span className="text-[11px]">Agregar</span>
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

      <button
        onClick={save}
        disabled={saving || !name.trim() || drafts.length === 0}
        className="rounded-full bg-[var(--color-coral)] py-3 text-sm font-bold text-white disabled:opacity-50 cursor-pointer"
      >
        {saving ? "Creando…" : "Crear pack"}
      </button>
    </div>
  );
}
