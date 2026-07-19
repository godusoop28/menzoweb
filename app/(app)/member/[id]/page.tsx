"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { GradientButton } from "@/components/GradientButton";
import { BackIcon } from "@/components/icons";
import { PostCard } from "@/components/PostCard";
import { WallMessageCard } from "@/components/WallMessageCard";
import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { postsByAuthor, wallMessagesForProfile } from "@/lib/store/selectors";
import { formatJoinDate } from "@/lib/time";

type Tab = "posts" | "wall";

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { state, actions } = useAppState();
  const [tab, setTab] = useState<Tab>("posts");
  const [openingChat, setOpeningChat] = useState(false);

  const isSelf = id === LOCAL_USER_ID;
  const user = state.social.users.find((u) => u.id === id);

  useEffect(() => {
    if (!id || isSelf) return;
    actions.addRecentlyViewed({ kind: "member", id, at: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (!isSelf) actions.ensureUserLoaded(id);
    actions.loadProfileWall(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (isSelf) router.replace("/profile");
  }, [isSelf, router]);

  if (isSelf) return null;

  if (!user) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-10 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">No encontramos este perfil.</p>
        <button onClick={() => router.back()} className="text-sm text-[var(--color-cyan)] cursor-pointer">
          Volver
        </button>
      </div>
    );
  }

  const isFollowing = state.social.following.includes(user.id);
  const posts = postsByAuthor(state.social, user.id);
  const wall = wallMessagesForProfile(state.social, user.id);

  async function handleMessage() {
    if (openingChat) return;
    setOpeningChat(true);
    const roomId = await actions.openDirectMessage(user!.id);
    setOpeningChat(false);
    if (roomId) router.push(`/chat/${roomId}`);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 md:px-8">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer">
        <BackIcon size={20} />
        Volver
      </button>

      <div className="overflow-hidden rounded-3xl border border-[var(--color-border-soft)] bg-[var(--color-surface)]">
        {user.coverUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.coverUri} alt="" className="h-36 w-full object-cover" />
        ) : (
          <div className="h-36 w-full bg-[var(--color-surface-elevated)]" />
        )}

        <div className="-mt-11 flex flex-col gap-3 px-6 pb-6">
          <div className="flex items-end justify-between gap-3">
            <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={92} showOnline online={user.isOnline} />
            <div className="flex gap-2">
              <GradientButton
                label={isFollowing ? "Siguiendo" : "Seguir"}
                onClick={() => actions.toggleFollow(user.id)}
                gradient={isFollowing ? "community" : "fire"}
                size="md"
                fullWidth={false}
              />
              <button
                onClick={handleMessage}
                disabled={openingChat}
                className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium disabled:opacity-50 cursor-pointer"
              >
                Mensaje
              </button>
            </div>
          </div>

          <div>
            <h1 className="font-display text-xl font-bold">{user.displayName}</h1>
            {!!user.statusText && <p className="text-sm text-[var(--color-text-secondary)]">{user.statusText}</p>}
          </div>

          <div className="grid grid-cols-4 gap-2 border-t border-[var(--color-border-soft)] pt-4 text-center">
            <Stat value={user.reputation} label="Reputación" />
            <Stat value={user.following} label="Siguiendo" />
            <Stat value={user.followers} label="Seguidores" />
            <Stat value={user.visitors} label="Visitantes" />
          </div>

          {!!user.bio && <p className="text-sm text-[var(--color-text-secondary)]">{user.bio}</p>}
          <p className="text-xs text-[var(--color-text-muted)]">Miembro desde {formatJoinDate(user.joinedAt)}</p>
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <TabButton active={tab === "posts"} onClick={() => setTab("posts")} label="Publicaciones" />
        <TabButton active={tab === "wall"} onClick={() => setTab("wall")} label="Muro" />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {tab === "posts" &&
          (posts.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">{user.displayName} todavía no ha publicado nada.</p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          ))}

        {tab === "wall" &&
          (wall.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Este muro todavía espera su primer recuerdo.</p>
          ) : (
            wall.map((message) => <WallMessageCard key={message.id} message={message} />)
          ))}
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium cursor-pointer ${
        active ? "bg-[var(--color-surface-soft)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
      }`}
    >
      {label}
    </button>
  );
}
