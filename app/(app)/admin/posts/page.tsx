"use client";

import { useState } from "react";

import { adminApi, postsApi } from "@/lib/api";
import { mapPost } from "@/lib/api/mappers";
import { useAppState } from "@/lib/AppStateContext";
import { BackIcon, EyeIcon, EyeOffIcon, TrashIcon } from "@/components/icons";
import { ReasonDialog } from "@/components/ui/ReasonDialog";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import type { Post } from "@/lib/types";

type PendingAction = { kind: "hide" | "unhide" | "delete"; post: Post } | null;

export default function AdminPostsPage() {
  const { state } = useAppState();
  const isLeaderPlus = state.profile?.globalRole === "LEADER" || state.profile?.globalRole === "MASTER";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<PendingAction>(null);
  const [busy, setBusy] = useState(false);

  async function search(q: string) {
    setQuery(q);
    setLoading(true);
    try {
      const page = await adminApi.searchPosts(q);
      setResults(page.items.map((dto) => mapPost(dto, LOCAL_USER_ID)));
    } catch (error) {
      console.warn("[menzo/web] admin searchPosts failed", error);
    } finally {
      setLoading(false);
    }
  }

  async function confirmAction(reason: string) {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "hide") {
        await adminApi.hidePost(pending.post.id, { reason });
        setResults((prev) => prev.map((p) => (p.id === pending.post.id ? { ...p, hidden: true } : p)));
      } else if (pending.kind === "unhide") {
        await adminApi.unhidePost(pending.post.id, { reason });
        setResults((prev) => prev.map((p) => (p.id === pending.post.id ? { ...p, hidden: false } : p)));
      } else {
        await postsApi.remove(pending.post.id, { reason });
        setResults((prev) => prev.filter((p) => p.id !== pending.post.id));
      }
      setPending(null);
    } catch (error) {
      console.warn("[menzo/web] admin post action failed", error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <a href="/admin" className="text-[var(--color-text-secondary)]">
          <BackIcon />
        </a>
        <h1 className="font-display text-xl font-bold">Publicaciones</h1>
      </div>

      <input
        value={query}
        onChange={(e) => search(e.target.value)}
        placeholder="Buscar por texto o título…"
        className="w-full rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-2.5 text-sm outline-none focus:border-[var(--color-coral)]"
      />

      {loading && <p className="text-sm text-[var(--color-text-muted)]">Buscando…</p>}
      {!loading && query && results.length === 0 && (
        <p className="text-sm text-[var(--color-text-muted)]">Sin resultados.</p>
      )}

      <div className="flex flex-col gap-2">
        {results.map((post) => (
          <div key={post.id} className="flex flex-col gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="line-clamp-2 flex-1 text-sm">{post.title || post.body || "(sin texto)"}</p>
              {post.hidden && (
                <span className="shrink-0 rounded-full bg-[var(--color-surface-secondary)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-muted)]">
                  Oculta
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {post.hidden ? (
                <button
                  onClick={() => setPending({ kind: "unhide", post })}
                  className="flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  <EyeIcon size={14} /> Mostrar
                </button>
              ) : (
                <button
                  onClick={() => setPending({ kind: "hide", post })}
                  className="flex items-center gap-1 rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
                >
                  <EyeOffIcon size={14} /> Ocultar
                </button>
              )}
              {isLeaderPlus && (
                <button
                  onClick={() => setPending({ kind: "delete", post })}
                  className="flex items-center gap-1 rounded-full bg-[var(--color-coral)] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer"
                >
                  <TrashIcon size={14} /> Eliminar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ReasonDialog
        open={!!pending}
        title={
          pending?.kind === "delete"
            ? "Eliminar publicación"
            : pending?.kind === "hide"
              ? "Ocultar publicación"
              : "Mostrar publicación"
        }
        description="El motivo queda registrado en el log de moderación, visible para el usuario maestro."
        confirmLabel={pending?.kind === "delete" ? "Eliminar" : "Confirmar"}
        busy={busy}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
