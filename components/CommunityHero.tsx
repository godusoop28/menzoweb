"use client";

import { useEffect, useState } from "react";

import { communityApi } from "@/lib/api";
import type { CommunityConfigDto } from "@/lib/api/types";

export function CommunityHero() {
  const [config, setConfig] = useState<CommunityConfigDto | null>(null);

  useEffect(() => {
    communityApi.config().then(setConfig).catch(() => {});
  }, []);

  if (!config) return null;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/banners/banner-community.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[rgba(7,9,13,0.42)]" />
      <div className="relative flex flex-col gap-1.5 p-6 text-white">
        <h2 className="font-display text-2xl font-bold">{config.name}</h2>
        <p className="font-medium text-white/85">{config.subtitle}</p>
        <p className="text-sm text-white/80">{config.description}</p>

        <div className="mt-2 flex items-center gap-2 text-sm text-white/85">
          <span>{config.memberCount.toLocaleString("es-ES")} miembros</span>
          <span className="h-1 w-1 rounded-full bg-white/60" />
          <span>{config.onlineCount} conectados</span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {config.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
