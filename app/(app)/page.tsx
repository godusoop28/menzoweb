"use client";

import { useState } from "react";

import { CreatePostComposer } from "@/components/CreatePostComposer";
import { PostCard } from "@/components/PostCard";
import { useAppState } from "@/lib/AppStateContext";
import { recentPosts } from "@/lib/store/selectors";

export default function FeedPage() {
  const { state, actions } = useAppState();
  const [refreshing, setRefreshing] = useState(false);

  const posts = recentPosts(state.social);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await actions.refreshSocial();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6 md:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Bienvenido de vuelta, {state.profile?.displayName}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Hay nuevas historias esperándote.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="rounded-full border border-[var(--color-border-soft)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 cursor-pointer"
        >
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      <CreatePostComposer />

      <div className="flex flex-col gap-4">
        {posts.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no hay publicaciones.</p>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </div>
  );
}
