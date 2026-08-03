"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { communitiesApi, uploadsApi } from "@/lib/api";
import type { CommunityDetailDto } from "@/lib/api/types";
import { useAppState } from "@/lib/AppStateContext";
import { BackIcon } from "@/components/icons";

const IMAGE_FIELDS: { key: keyof Pick<CommunityDetailDto, "iconUrl" | "logoUrl" | "coverUrl" | "backgroundUrl" | "bannerUrl">; label: string }[] = [
  { key: "iconUrl", label: "Icono" },
  { key: "logoUrl", label: "Logo" },
  { key: "coverUrl", label: "Portada" },
  { key: "bannerUrl", label: "Banner" },
  { key: "backgroundUrl", label: "Fondo" },
];

const COLOR_FIELDS: { key: keyof Pick<CommunityDetailDto, "primaryColor" | "secondaryColor" | "accentColor">; label: string }[] = [
  { key: "primaryColor", label: "Color primario" },
  { key: "secondaryColor", label: "Color secundario" },
  { key: "accentColor", label: "Color de acento" },
];

/** COMMUNITY_ADMIN+ de esta comunidad, o cuenta global LEADER+ — ver
 * CommunityPermissionEvaluator.requireCanEditAppearance en menzoapi (el backend re-valida
 * siempre; esta pantalla solo evita ofrecer el botón donde de todos modos rebotaría). */
export default function CommunityAppearancePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { state } = useAppState();
  const [community, setCommunity] = useState<CommunityDetailDto | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    communitiesApi
      .getBySlug(params.slug)
      .then((detail) => {
        setCommunity(detail);
        setImages({
          iconUrl: detail.iconUrl ?? "",
          logoUrl: detail.logoUrl ?? "",
          coverUrl: detail.coverUrl ?? "",
          bannerUrl: detail.bannerUrl ?? "",
          backgroundUrl: detail.backgroundUrl ?? "",
        });
        setColors({
          primaryColor: detail.primaryColor ?? "",
          secondaryColor: detail.secondaryColor ?? "",
          accentColor: detail.accentColor ?? "",
        });
      })
      .catch((err) => {
        console.warn("[menzo/web] getBySlug failed", err);
        setError("No pudimos cargar esta comunidad.");
      })
      .finally(() => setLoading(false));
  }, [params.slug]);

  const globalRole = state.profile?.globalRole;
  const isGlobalStaff = globalRole === "LEADER" || globalRole === "MASTER";
  const communityRole = community?.myMembership?.communityRole;
  const isCommunityAdmin = communityRole === "COMMUNITY_ADMIN" || communityRole === "COMMUNITY_OWNER";
  const canEdit = isGlobalStaff || isCommunityAdmin;

  async function handleUpload(key: string, file: File) {
    try {
      const url = await uploadsApi.upload(file);
      setImages((prev) => ({ ...prev, [key]: url }));
    } catch (err) {
      console.warn("[menzo/web] upload failed", err);
      setError("No pudimos subir la imagen.");
    }
  }

  async function handleSave() {
    if (!community) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await communitiesApi.updateAppearance(community.id, { ...images, ...colors });
      setCommunity(updated);
      router.push("/communities");
    } catch (err) {
      console.warn("[menzo/web] updateAppearance failed", err);
      setError("No pudimos guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="p-6 text-sm text-[var(--color-text-muted)]">Cargando…</p>;
  if (!community) return <p className="p-6 text-sm text-[var(--color-coral)]">{error ?? "Comunidad no encontrada."}</p>;
  if (!canEdit) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-3 px-4 py-6 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">
          No tenés permisos para editar la apariencia de {community.name}.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[var(--color-text-secondary)] cursor-pointer">
          <BackIcon />
        </button>
        <h1 className="font-display text-xl font-bold">Apariencia de {community.name}</h1>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Imágenes</h2>
        {IMAGE_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface-secondary)]">
              {images[key] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={images[key]} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">Sin imagen</span>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{label}</p>
              <label className="mt-1 inline-block cursor-pointer rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold">
                Cambiar
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpload(key, file);
                  }}
                />
              </label>
            </div>
          </div>
        ))}

        <h2 className="mt-2 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Colores</h2>
        {COLOR_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <input
              type="color"
              value={colors[key] || "#888888"}
              onChange={(e) => setColors((prev) => ({ ...prev, [key]: e.target.value }))}
              className="h-10 w-10 shrink-0 cursor-pointer rounded-lg border border-[var(--color-border-soft)] bg-transparent"
            />
            <p className="flex-1 text-sm font-medium">{label}</p>
            <span className="text-xs text-[var(--color-text-muted)]">{colors[key] || "—"}</span>
          </div>
        ))}

        {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 rounded-full bg-[var(--color-coral)] py-3 text-sm font-bold text-white disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
