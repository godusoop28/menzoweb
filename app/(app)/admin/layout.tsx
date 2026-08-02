"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAppState } from "@/lib/AppStateContext";

/** Todas las rutas /admin/** quedan detrás de este guard — cualquier globalRole !== "USER"
 * puede entrar; cada pantalla decide internamente qué mostrar según CURATOR/LEADER/MASTER
 * (p. ej. moderation-log/page.tsx redirige de nuevo si no sos MASTER). */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { state } = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (!state.isHydrated) return;
    if (!state.profile || state.profile.globalRole === "USER") {
      router.replace("/");
    }
  }, [state.isHydrated, state.profile, router]);

  if (!state.isHydrated || !state.profile || state.profile.globalRole === "USER") {
    return null;
  }

  return <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">{children}</div>;
}
