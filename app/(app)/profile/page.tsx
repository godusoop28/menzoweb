"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ContextSidebar, ContextSidebarSection } from "@/components/ContextSidebar";
import { PostCard } from "@/components/PostCard";
import { ProfileHero } from "@/components/ProfileHero";
import { ScreenBackground } from "@/components/ScreenBackground";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { WallComposer } from "@/components/WallComposer";
import { WallMessageCard } from "@/components/WallMessageCard";
import { interestById } from "@/data/interests";
import { getMyRealId } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { postsByAuthor, savedPosts, wallMessagesForProfile } from "@/lib/store/selectors";
import { formatJoinDate } from "@/lib/time";

type Tab = "posts" | "wall" | "blogs" | "saved";
const VALID_TABS: Tab[] = ["posts", "wall", "blogs", "saved"];

export default function ProfilePage() {
  const { state, actions } = useAppState();
  const [refreshing, setRefreshing] = useState(false);
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab = VALID_TABS.includes(tabParam as Tab) ? (tabParam as Tab) : "posts";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [tabSyncedFor, setTabSyncedFor] = useState(tabParam);
  // El sidebar navega a /profile?tab=wall|saved — mismo patrón de "ajustar estado durante el
  // render" que app/(app)/page.tsx, sin pisar el tab si el usuario ya lo cambió a mano.
  if (tabParam !== tabSyncedFor) {
    setTab(initialTab);
    setTabSyncedFor(tabParam);
  }
  const profile = state.profile;

  useEffect(() => {
    // state.profile es un caché en memoria que solo se actualiza con acciones explícitas (login,
    // "Actualizar" manual) — sin este refresh al abrir la pantalla, un título que otro LEADER te
    // haya puesto mientras tanto no aparecía hasta tocar ese botón a mano.
    actions.refreshProfile();
    actions.loadProfileWall(LOCAL_USER_ID);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await actions.refreshProfile();
      await actions.refreshSocial();
    } catch (error) {
      console.warn("[menzo/web] profile refresh failed", error);
    } finally {
      setRefreshing(false);
    }
  }

  if (!profile) return null;

  const myRealId = getMyRealId();
  const allMyPosts = postsByAuthor(state.social, LOCAL_USER_ID);
  const myPosts = allMyPosts.filter((p) => p.type !== "blog");
  const myBlogs = allMyPosts.filter((p) => p.type === "blog");
  const myWall = wallMessagesForProfile(state.social, LOCAL_USER_ID);
  const mySaved = savedPosts(state.social, LOCAL_USER_ID);

  const hasBackground = !!(profile.backgroundUri || profile.backgroundColor);
  const canManageTitles = profile.globalRole === "LEADER" || profile.globalRole === "MASTER";

  const content = (
    <div className="flex w-full flex-col gap-6 px-4 py-6 md:px-8 lg:flex-row lg:items-start lg:gap-6">
    <div className="menzo-fade-in mx-auto w-full max-w-2xl lg:mx-0 lg:max-w-[720px] lg:flex-1">
      <ProfileHero
        user={profile}
        canManageTitles={canManageTitles}
        onAddTitle={(text, color) => actions.addUserTitle(LOCAL_USER_ID, text, color)}
        onRemoveTitle={(title) => actions.removeUserTitle(LOCAL_USER_ID, title.id)}
        actions={
          <>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-full border border-[var(--color-border-soft)] px-4 py-2 text-sm text-[var(--color-text-secondary)] disabled:opacity-50 cursor-pointer"
            >
              {refreshing ? "…" : "Actualizar"}
            </button>
            <Link href="/profile/edit" className="rounded-full border border-[var(--color-border-strong)] px-4 py-2 text-sm font-medium cursor-pointer">
              Editar perfil
            </Link>
          </>
        }
      />

      <div className="mt-4 grid grid-cols-5 gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] py-4 text-center">
        <Stat value={profile.followers} label="Seguidores" href={myRealId ? `/connections/${myRealId}/followers` : undefined} />
        <Stat value={profile.following} label="Siguiendo" href={myRealId ? `/connections/${myRealId}/following` : undefined} />
        <Stat value={profile.reputation} label="Reputación" />
        <Stat value={allMyPosts.length} label="Publicaciones" />
        <Stat value={myBlogs.length} label="Blogs" />
      </div>
      <p className="mt-2 text-center text-xs text-[var(--color-text-muted)] lg:text-left">Miembro desde {formatJoinDate(profile.joinedAt)}</p>

      <div className="mt-6">
        <SegmentedTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: "posts", label: "Publicaciones" },
            { value: "wall", label: "Muro" },
            { value: "blogs", label: "Blogs" },
            { value: "saved", label: "Guardados" },
          ]}
        />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {tab === "posts" &&
          (myPosts.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no has publicado nada.</p>
          ) : (
            myPosts.map((post) => <PostCard key={post.id} post={post} />)
          ))}

        {tab === "wall" && (
          <>
            <WallComposer profileId={LOCAL_USER_ID} placeholder={`Escribe algo para ${profile.displayName}…`} />
            {myWall.length === 0 ? (
              <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Este muro todavía espera su primer recuerdo.</p>
            ) : (
              myWall.map((message) => <WallMessageCard key={message.id} message={message} />)
            )}
          </>
        )}

        {tab === "blogs" &&
          (myBlogs.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no has escrito ningún blog.</p>
          ) : (
            myBlogs.map((post) => <PostCard key={post.id} post={post} />)
          ))}

        {tab === "saved" &&
          (mySaved.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">Todavía no has guardado ningún recuerdo.</p>
          ) : (
            mySaved.map((post) => <PostCard key={post.id} post={post} />)
          ))}
      </div>
    </div>

    <ContextSidebar>
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-center">
        <div>
          <p className="text-lg font-bold">{allMyPosts.length}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">Publicaciones</p>
        </div>
        <div>
          <p className="text-lg font-bold">{myWall.length}</p>
          <p className="text-[11px] text-[var(--color-text-muted)]">Mensajes en el muro</p>
        </div>
      </div>

      {profile.interests.length > 0 && (
        <ContextSidebarSection title="Intereses">
          <div className="flex flex-wrap gap-1.5">
            {profile.interests.map((interest) => (
              <span key={interest} className="rounded-full bg-[var(--color-surface-secondary)] px-2.5 py-1 text-xs font-medium">
                {interestById(interest)?.label ?? interest}
              </span>
            ))}
          </div>
        </ContextSidebarSection>
      )}
    </ContextSidebar>
    </div>
  );

  if (!hasBackground) return content;
  return (
    <ScreenBackground src={profile.backgroundUri} color={profile.backgroundColor}>
      {content}
    </ScreenBackground>
  );
}

function Stat({ value, label, href }: { value: number; label: string; href?: string }) {
  const content = (
    <>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-75">
        {content}
      </Link>
    );
  }
  return <div>{content}</div>;
}
