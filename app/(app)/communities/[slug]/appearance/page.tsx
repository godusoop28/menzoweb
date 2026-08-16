"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ApiError, communitiesApi, uploadsApi } from "@/lib/api";
import type {
  CommunityDetailDto,
  CommunityNavigationConfig,
  CommunityNavigationSectionKey,
  CommunityThemeConfig,
} from "@/lib/api/types";
import { useAppState } from "@/lib/AppStateContext";
import { useCommunity } from "@/lib/communities/CommunityContext";
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

const THEME_IMAGE_FIELDS: { key: "navBackgroundUrl" | "feedBackgroundUrl" | "chatBackgroundUrl"; label: string }[] = [
  { key: "navBackgroundUrl", label: "Fondo del menú/navegación" },
  { key: "feedBackgroundUrl", label: "Fondo del feed" },
  { key: "chatBackgroundUrl", label: "Fondo de la bandeja de mensajes" },
];

const HEADER_STYLES = ["default", "compact", "banner", "minimal"];
const CARD_STYLES = ["rounded", "square", "flat", "elevated"];

const NAV_SECTION_DEFAULTS: { key: CommunityNavigationSectionKey; label: string; order: number }[] = [
  { key: "home", label: "Inicio", order: 1 },
  { key: "posts", label: "Publicaciones", order: 2 },
  { key: "blogs", label: "Blogs", order: 3 },
  { key: "chats", label: "Chats", order: 4 },
  { key: "live", label: "LIVE", order: 5 },
  { key: "members", label: "Miembros", order: 6 },
  { key: "events", label: "Eventos", order: 7 },
  { key: "about", label: "Información", order: 8 },
];

function withNavDefaults(config: CommunityNavigationConfig): CommunityNavigationConfig {
  const next: CommunityNavigationConfig = { ...config };
  for (const { key, label, order } of NAV_SECTION_DEFAULTS) {
    if (!next[key]) next[key] = { enabled: true, order, label };
  }
  return next;
}

/** COMMUNITY_ADMIN+ de esta comunidad, o cuenta global LEADER+ — ver
 * CommunityPermissionEvaluator.requireCanEditAppearance en menzoapi (el backend re-valida
 * siempre; esta pantalla solo evita ofrecer el botón donde de todos modos rebotaría).
 *
 * Además de imágenes/colores (apariencia), edita themeConfig (fondos adicionales de feed/chat,
 * estilo de encabezado/tarjetas, decoraciones) y navigationConfig (qué secciones se muestran, en
 * qué orden, con qué etiqueta) — ambos JSONB de shape libre en el backend, ver
 * UpdateCommunityThemeRequest/UpdateCommunityNavigationRequest. */
export default function CommunityAppearancePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { state } = useAppState();
  const { refreshActiveCommunityDetail } = useCommunity();
  const [community, setCommunity] = useState<CommunityDetailDto | null>(null);
  const [images, setImages] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState<CommunityThemeConfig>({});
  const [nav, setNav] = useState<CommunityNavigationConfig>({});
  const [newDecorationUrl, setNewDecorationUrl] = useState("");
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
        setTheme(detail.themeConfig ?? {});
        setNav(withNavDefaults(detail.navigationConfig ?? {}));
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
  // COMMUNITY_CURATOR+ — igual que CommunityPermissionEvaluator.requireCanEditAppearance.
  const CAN_EDIT_ROLES = new Set(["COMMUNITY_CURATOR", "COMMUNITY_MODERATOR", "COMMUNITY_ADMIN", "COMMUNITY_OWNER"]);
  const isCommunityStaff = !!communityRole && CAN_EDIT_ROLES.has(communityRole);
  const canEdit = isGlobalStaff || isCommunityStaff;

  async function handleUpload(key: string, file: File) {
    try {
      const url = await uploadsApi.upload(file);
      setImages((prev) => ({ ...prev, [key]: url }));
    } catch (err) {
      console.warn("[menzo/web] upload failed", err);
      setError(err instanceof ApiError ? err.message : "No pudimos subir la imagen.");
    }
  }

  async function handleThemeImageUpload(key: "navBackgroundUrl" | "feedBackgroundUrl" | "chatBackgroundUrl", file: File) {
    try {
      const url = await uploadsApi.upload(file);
      setTheme((prev) => ({ ...prev, [key]: url }));
    } catch (err) {
      console.warn("[menzo/web] upload failed", err);
      setError(err instanceof ApiError ? err.message : "No pudimos subir la imagen.");
    }
  }

  async function handleDecorationUpload(file: File) {
    try {
      const url = await uploadsApi.upload(file);
      setTheme((prev) => ({ ...prev, decorations: [...(prev.decorations ?? []), url] }));
    } catch (err) {
      console.warn("[menzo/web] upload failed", err);
      setError(err instanceof ApiError ? err.message : "No pudimos subir la imagen.");
    }
  }

  function addDecorationUrl() {
    const url = newDecorationUrl.trim();
    if (!url) return;
    setTheme((prev) => ({ ...prev, decorations: [...(prev.decorations ?? []), url] }));
    setNewDecorationUrl("");
  }

  function removeDecoration(index: number) {
    setTheme((prev) => ({ ...prev, decorations: (prev.decorations ?? []).filter((_, i) => i !== index) }));
  }

  function updateNavSection(key: CommunityNavigationSectionKey, patch: Partial<{ enabled: boolean; order: number; label: string }>) {
    setNav((prev) => {
      const current = prev[key] ?? { enabled: true, order: 0, label: key };
      return { ...prev, [key]: { ...current, ...patch } };
    });
  }

  async function handleSave() {
    if (!community) return;
    setSaving(true);
    setError(null);
    try {
      await communitiesApi.updateAppearance(community.id, { ...images, ...colors });
      await communitiesApi.updateTheme(community.id, { themeConfig: theme });
      await communitiesApi.updateNavigation(community.id, { navigationConfig: nav });
      await refreshActiveCommunityDetail();
      router.push("/communities");
    } catch (err) {
      console.warn("[menzo/web] save community customization failed", err);
      setError(err instanceof ApiError ? err.message : "No pudimos guardar los cambios.");
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

  const sortedNavKeys = (Object.keys(nav) as CommunityNavigationSectionKey[]).sort(
    (a, b) => (nav[a]?.order ?? 0) - (nav[b]?.order ?? 0)
  );

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

        <h2 className="mt-2 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Fondos adicionales
        </h2>
        {THEME_IMAGE_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface-secondary)]">
              {theme[key] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme[key] as string} alt="" className="h-full w-full object-cover" />
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
                    if (file) handleThemeImageUpload(key, file);
                  }}
                />
              </label>
            </div>
          </div>
        ))}

        <h2 className="mt-2 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Estilo</h2>
        <div className="flex items-center gap-3">
          <p className="w-32 text-sm font-medium">Encabezado</p>
          <select
            value={theme.headerStyle ?? "default"}
            onChange={(e) => setTheme((prev) => ({ ...prev, headerStyle: e.target.value }))}
            className="flex-1 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm"
          >
            {HEADER_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <p className="w-32 text-sm font-medium">Tarjetas</p>
          <select
            value={theme.cardStyle ?? "rounded"}
            onChange={(e) => setTheme((prev) => ({ ...prev, cardStyle: e.target.value }))}
            className="flex-1 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3 py-2 text-sm"
          >
            {CARD_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <h2 className="mt-2 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Decoraciones
        </h2>
        <p className="text-xs text-[var(--color-text-muted)]">
          Marcos, insignias, separadores o fondos de temporada — imágenes sueltas que se pueden usar en la comunidad.
        </p>
        <div className="flex flex-wrap gap-2">
          {(theme.decorations ?? []).map((url, i) => (
            <div key={`${url}-${i}`} className="relative h-16 w-16 overflow-hidden rounded-lg bg-[var(--color-surface-secondary)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removeDecoration(i)}
                className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-bl-lg bg-black/60 text-xs text-white cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label className="cursor-pointer rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold">
            Subir imagen
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleDecorationUpload(file);
              }}
            />
          </label>
          <input
            type="text"
            value={newDecorationUrl}
            onChange={(e) => setNewDecorationUrl(e.target.value)}
            placeholder="o pegá una URL"
            className="flex-1 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-3 py-2 text-xs"
          />
          <button
            onClick={addDecorationUrl}
            className="rounded-full bg-[var(--color-surface-secondary)] px-3 py-1.5 text-xs font-semibold cursor-pointer"
          >
            Agregar
          </button>
        </div>

        <h2 className="mt-2 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Navegación
        </h2>
        <div className="flex flex-col gap-2">
          {sortedNavKeys.map((key) => {
            const section = nav[key]!;
            return (
              <div key={key} className="flex items-center gap-2 rounded-lg border border-[var(--color-border-soft)] p-2">
                <input
                  type="checkbox"
                  checked={section.enabled}
                  onChange={(e) => updateNavSection(key, { enabled: e.target.checked })}
                  className="h-4 w-4 shrink-0 cursor-pointer"
                />
                <input
                  type="text"
                  value={section.label}
                  onChange={(e) => updateNavSection(key, { label: e.target.value })}
                  className="flex-1 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-2 py-1 text-sm"
                />
                <input
                  type="number"
                  value={section.order}
                  onChange={(e) => updateNavSection(key, { order: Number(e.target.value) || 0 })}
                  className="w-16 rounded-lg border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-2 py-1 text-sm"
                />
              </div>
            );
          })}
        </div>

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
