"use client";

import { useEffect, useRef, useState } from "react";

import { EditIcon, MoreIcon, TrashIcon } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import type { Post } from "@/lib/types";

import { EditPostDialog } from "./EditPostDialog";

/** Menú "⋮" con Editar/Eliminar — visible para el autor y, además, para CURATOR+/LEADER+/MASTER
 * (moderación), mismo criterio que PostService.updatePost/deletePost en menzoapi. Editar solo
 * aplica a text/image (lo único que el backend sabe editar); Eliminar aplica a cualquier tipo.
 * Un no-autor siempre necesita un motivo (lo pide EditPostDialog al editar, este diálogo al
 * borrar) que queda en el log de moderación. 1:1 con
 * menzomovil/lib/features/home/post_card.dart (_PostMenuButton).
 */
export function PostMenuButton({ post }: { post: Post }) {
  const { state, actions } = useAppState();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isAuthor = post.authorId === LOCAL_USER_ID;
  const isStaff = !!state.profile && state.profile.globalRole !== "USER";
  const canDelete = isAuthor || isStaff;
  const canEdit = canDelete && (post.type === "text" || post.type === "image");

  if (!canDelete) return null;

  async function handleDelete(reason?: string) {
    setDeleting(true);
    try {
      await actions.deletePost(post.id, reason);
      setConfirmingDelete(false);
      setReasonDialogOpen(false);
    } catch (err) {
      console.warn("[menzo/web] deletePost failed", err);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div ref={ref} className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Más opciones"
        className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-secondary)] cursor-pointer"
      >
        <MoreIcon size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-1 flex w-40 flex-col overflow-hidden rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-1 shadow-xl">
          {canEdit && (
            <button
              onClick={() => {
                setEditing(true);
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm cursor-pointer hover:bg-[var(--color-surface-secondary)]"
            >
              <EditIcon size={15} /> Editar
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              if (isAuthor) setConfirmingDelete(true);
              else setReasonDialogOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[var(--color-coral)] cursor-pointer hover:bg-[var(--color-surface-secondary)]"
          >
            <TrashIcon size={15} /> Eliminar
          </button>
        </div>
      )}

      {canEdit && <EditPostDialog post={post} isAuthor={isAuthor} open={editing} onClose={() => setEditing(false)} />}

      <ConfirmDialog
        open={confirmingDelete}
        title="¿Eliminar esta publicación?"
        description="No se puede deshacer."
        confirmLabel="Eliminar"
        danger
        busy={deleting}
        onConfirm={() => handleDelete()}
        onCancel={() => setConfirmingDelete(false)}
      />

      <ReasonDialog
        open={reasonDialogOpen}
        title="Eliminar publicación"
        description="Esta acción queda registrada en el log de moderación."
        confirmLabel="Eliminar"
        busy={deleting}
        onConfirm={(reason) => handleDelete(reason)}
        onCancel={() => setReasonDialogOpen(false)}
      />
    </div>
  );
}
