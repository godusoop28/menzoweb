"use client";

import { useRef, useState } from "react";

import { GifPickerSheet } from "./GifPickerSheet";
import { ChevronDownIcon, CloseIcon, ImageIcon, PlusIcon } from "@/components/icons";
import { uploadsApi } from "@/lib/api/endpoints";
import type { GifResultDto, PostBlockDto } from "@/lib/api/types";

const MAX_BLOCKS = 40;

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b-${Date.now()}-${Math.random()}`;
}

/** Editor de bloques hecho a mano (sin tiptap/slate/lexical) — cada bloque es texto plano dentro
 * de un campo entero, sin formato inline (negrita/itálica dentro de un párrafo), que es
 * exactamente el problema que esas librerías resuelven y que acá no hace falta resolver: esto es
 * ~250 líneas de useState + insertar/mover/borrar, no un motor de rich-text. 1:1 con
 * menzomovil/lib/features/post/block_editor.dart.
 *
 * Las imágenes/GIFs se suben de inmediato al agregarse (no se junta todo para el submit) — cada
 * bloque en `blocks` siempre tiene una URL https ya resuelta, nunca una ruta local; mientras un
 * archivo está subiendo se muestra como un bloque temporal aparte, fuera de `blocks`, para que
 * "Publicar" nunca pueda mandar un bloque a medio subir. */
export function BlockEditor({ blocks, onChange }: { blocks: PostBlockDto[]; onChange: (blocks: PostBlockDto[]) => void }) {
  const [uploading, setUploading] = useState<{ previewUrl: string } | null>(null);
  const [uploadError, setUploadError] = useState(false);
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const atLimit = blocks.length >= MAX_BLOCKS;

  function addBlock(block: PostBlockDto) {
    onChange([...blocks, block]);
  }
  function updateText(id: string, text: string) {
    onChange(blocks.map((b) => (b.id === id ? { ...b, text } : b)));
  }
  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }
  function moveBlock(id: string, dir: -1 | 1) {
    const idx = blocks.findIndex((b) => b.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setUploading({ previewUrl });
    setUploadError(false);
    try {
      const url = await uploadsApi.upload(file);
      addBlock({ id: newId(), type: file.type === "image/gif" ? "gif" : "image", text: null, url, alt: null });
    } catch (error) {
      console.warn("[menzo/web] block image upload failed", error);
      setUploadError(true);
    } finally {
      setUploading(null);
      URL.revokeObjectURL(previewUrl);
    }
  }

  function handlePickGif(gif: GifResultDto) {
    addBlock({ id: newId(), type: "gif", text: null, url: gif.url, alt: null });
    setGifPickerOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {blocks.map((block, i) => (
        <BlockRow
          key={block.id}
          block={block}
          canMoveUp={i > 0}
          canMoveDown={i < blocks.length - 1}
          onChangeText={(text) => updateText(block.id, text)}
          onMoveUp={() => moveBlock(block.id, -1)}
          onMoveDown={() => moveBlock(block.id, 1)}
          onRemove={() => removeBlock(block.id)}
        />
      ))}

      {uploading && (
        <div className="relative h-40 w-full overflow-hidden rounded-xl bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uploading.previewUrl} alt="" className="h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          </div>
        </div>
      )}
      {uploadError && <p className="text-xs text-[var(--color-coral)]">No pudimos subir esa imagen. Probá de nuevo.</p>}

      {!atLimit && (
        <div className="flex flex-wrap gap-2 pt-1">
          <AddButton label="Párrafo" onClick={() => addBlock({ id: newId(), type: "paragraph", text: "", url: null, alt: null })} />
          <AddButton label="Título" onClick={() => addBlock({ id: newId(), type: "heading", text: "", url: null, alt: null })} />
          <AddButton label="Imagen" icon={<ImageIcon size={14} />} onClick={() => fileInputRef.current?.click()} disabled={!!uploading} />
          <AddButton label="GIF" onClick={() => setGifPickerOpen(true)} />
          <AddButton label="Separador" onClick={() => addBlock({ id: newId(), type: "divider", text: null, url: null, alt: null })} />
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {gifPickerOpen && <GifPickerSheet onPick={handlePickGif} onClose={() => setGifPickerOpen(false)} />}
    </div>
  );
}

function AddButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-full border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer disabled:opacity-50"
    >
      {icon ?? <PlusIcon size={14} />}
      {label}
    </button>
  );
}

function BlockRow({
  block,
  canMoveUp,
  canMoveDown,
  onChangeText,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  block: PostBlockDto;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onChangeText: (text: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="group flex items-start gap-2 rounded-xl bg-[var(--color-surface-secondary)] p-2">
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        {block.type === "paragraph" && (
          <textarea
            value={block.text ?? ""}
            onChange={(e) => onChangeText(e.target.value.slice(0, 2000))}
            placeholder="Escribí un párrafo…"
            rows={3}
            className="w-full resize-none rounded-lg bg-[var(--color-surface)] p-2.5 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
          />
        )}
        {block.type === "heading" && (
          <input
            value={block.text ?? ""}
            onChange={(e) => onChangeText(e.target.value.slice(0, 150))}
            placeholder="Título de sección…"
            className="w-full rounded-lg bg-[var(--color-surface)] px-2.5 py-2 text-sm font-bold outline-none placeholder:text-[var(--color-text-muted)] placeholder:font-normal"
          />
        )}
        {(block.type === "image" || block.type === "gif") && block.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={block.url} alt="" className="max-h-56 w-full rounded-lg object-cover" />
        )}
        {block.type === "divider" && (
          <div className="flex items-center gap-2 py-1 text-xs text-[var(--color-text-muted)]">
            <hr className="flex-1 border-[var(--color-border-soft)]" />
            Separador
            <hr className="flex-1 border-[var(--color-border-soft)]" />
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1 opacity-60 transition-opacity group-hover:opacity-100">
        <IconButton label="Subir" disabled={!canMoveUp} onClick={onMoveUp}>
          <ChevronDownIcon size={12} className="rotate-180" />
        </IconButton>
        <IconButton label="Bajar" disabled={!canMoveDown} onClick={onMoveDown}>
          <ChevronDownIcon size={12} />
        </IconButton>
        <IconButton label="Eliminar bloque" onClick={onRemove}>
          <CloseIcon size={12} />
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  label,
  children,
  onClick,
  disabled,
}: {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-pointer disabled:cursor-default disabled:opacity-30"
    >
      {children}
    </button>
  );
}
