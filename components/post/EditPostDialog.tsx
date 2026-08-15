"use client";

import { useState } from "react";

import { GradientButton } from "@/components/GradientButton";
import { Sheet } from "@/components/ui/Sheet";
import { useAppState } from "@/lib/AppStateContext";
import type { PostBlockDto } from "@/lib/api/types";
import type { Post } from "@/lib/types";

import { BlockEditor } from "./BlockEditor";

function hasRealContent(blocks: PostBlockDto[]) {
  return blocks.some(
    (b) => ((b.type === "paragraph" || b.type === "heading") && !!b.text?.trim()) || b.type === "image" || b.type === "gif"
  );
}

/** Editar un post existente (solo text/image, lo único con `blocks` — ver UpdatePostRequest en
 * menzoapi). Cuando quien edita no es el autor (un CURATOR+ moderando), pide un motivo
 * obligatorio, igual que al borrar. 1:1 con menzomovil/lib/features/post/create_post_screen.dart
 * en modo `editing`. */
export function EditPostDialog({
  post,
  isAuthor,
  open,
  onClose,
}: {
  post: Post;
  isAuthor: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const { actions } = useAppState();
  const [title, setTitle] = useState(post.title ?? "");
  const [blocks, setBlocks] = useState<PostBlockDto[]>(post.blocks);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = hasRealContent(blocks) && (isAuthor || reason.trim().length > 0) && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await actions.updatePost(post.id, {
        title: title.trim() || undefined,
        blocks,
        reason: isAuthor ? undefined : reason.trim(),
      });
      onClose();
    } catch (err) {
      console.warn("[menzo/web] updatePost failed", err);
      setError("No pudimos guardar los cambios — probá de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Editar publicación"
      widthClassName="max-w-xl"
      footer={
        <div className="flex flex-col gap-2">
          {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}
          <GradientButton label="Guardar cambios" onClick={handleSave} disabled={!canSave} loading={saving} fullWidth />
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="Título (opcional)"
          className="w-full rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none placeholder:text-[var(--color-text-muted)]"
        />
        <BlockEditor blocks={blocks} onChange={setBlocks} />
        {!isAuthor && (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 300))}
            placeholder="Motivo de la edición (obligatorio, visible para moderación)"
            rows={2}
            className="w-full resize-none rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] p-3 text-sm outline-none focus:border-[var(--color-coral)]"
          />
        )}
      </div>
    </Sheet>
  );
}
