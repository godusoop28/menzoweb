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
import { withNavDefaults } from "@/lib/communities/navigationDefaults";
import { BackIcon, CheckIcon, CloseIcon, HomeIcon, ChatIcon, UsersIcon } from "@/components/icons";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { ColorWheelPicker } from "@/components/ui/ColorWheelPicker";

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

type ThemeImageKey =
  | "navBackgroundUrl"
  | "feedBackgroundUrl"
  | "chatBackgroundUrl"
  | "overlayDecorationUrl"
  | "featuredVisualUrl";

/** `chatBackgroundUrl` pinta la LISTA de chats de la comunidad, no una conversación — el
 * wallpaper de una conversación es personal por usuario+sala y vive local en cada cliente (ver
 * lib/chat/chatAppearance.ts). No "completar" este campo hacia significar eso: son sistemas
 * independientes a propósito. */
const THEME_IMAGE_FIELDS: { key: ThemeImageKey; label: string; helper?: string }[] = [
  { key: "navBackgroundUrl", label: "Fondo del menú/navegación" },
  { key: "feedBackgroundUrl", label: "Fondo del feed" },
  {
    key: "chatBackgroundUrl",
    label: "Fondo de la lista de chats",
    helper: "Solo se ve en la lista de chats de la comunidad — el fondo de cada conversación lo elige cada persona.",
  },
  { key: "overlayDecorationUrl", label: "Overlay / decoración", helper: "PNG transparente, se aplica en slots seguros." },
  { key: "featuredVisualUrl", label: "Imagen destacada", helper: "Para hero secundarios, eventos o cards destacadas." },
];

const HEADER_STYLES = ["default", "compact", "banner", "minimal"];
const CARD_STYLES = ["rounded", "square", "flat", "elevated"];

type SettingsTab = "apariencia" | "colores" | "navegacion";

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
  const [expandedColorKey, setExpandedColorKey] = useState<string | null>(null);
  const [theme, setTheme] = useState<CommunityThemeConfig>({});
  const [nav, setNav] = useState<CommunityNavigationConfig>({});
  const [newDecorationUrl, setNewDecorationUrl] = useState("");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("apariencia");
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

  async function handleThemeImageUpload(key: ThemeImageKey, file: File) {
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

  const previewName = community.name;
  const previewIcon = images.iconUrl;
  const previewCover = images.coverUrl || images.bannerUrl;
  const previewPrimary = colors.primaryColor || "#e74c3c";
  const previewSecondary = colors.secondaryColor || "#2c3e50";
  const previewNavBg = (theme.navigationBackgroundUrl as string | undefined) || (theme.navBackgroundUrl as string | undefined);
  const previewNavSections = (Object.keys(nav) as CommunityNavigationSectionKey[])
    .map((key) => ({ key, ...nav[key]! }))
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order)
    .slice(0, 4);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[var(--color-text-secondary)] cursor-pointer">
          <BackIcon />
        </button>
        <div>
          <h1 className="font-display text-xl font-bold">Personalización de {community.name}</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">Personaliza la apariencia visual de tu comunidad en web y móvil.</p>
        </div>
      </div>

      <div className="flex w-full flex-col gap-6 lg:flex-row lg:items-start">
      <div className="flex w-full flex-col gap-4 lg:max-w-xl">
        <SegmentedTabs
          value={settingsTab}
          onChange={setSettingsTab}
          options={[
            { value: "apariencia", label: "Apariencia" },
            { value: "colores", label: "Colores" },
            { value: "navegacion", label: "Navegación" },
          ]}
        />

        {settingsTab === "apariencia" && (
        <>
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

        <h2 className="mt-2 text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Fondos adicionales
        </h2>
        {THEME_IMAGE_FIELDS.map(({ key, label, helper }) => (
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
              {helper && <p className="text-xs text-[var(--color-text-muted)]">{helper}</p>}
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
                className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-bl-lg bg-black/60 text-white cursor-pointer"
              >
                <CloseIcon size={11} />
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
        </>
        )}

        {settingsTab === "colores" && (
        <>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Colores principales</h2>
        <p className="text-xs text-[var(--color-text-muted)]">Define la paleta de colores que se aplicará en toda tu comunidad.</p>
        {COLOR_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex flex-col gap-3 rounded-xl border border-[var(--color-border-soft)] p-3">
            <button
              type="button"
              onClick={() => setExpandedColorKey((prev) => (prev === key ? null : key))}
              className="flex w-full cursor-pointer items-center gap-3"
            >
              <span
                className="h-10 w-10 shrink-0 rounded-lg border border-[var(--color-border-soft)]"
                style={{ background: colors[key] || "#888888" }}
              />
              <p className="flex-1 text-left text-sm font-medium">{label}</p>
              <span className="text-xs text-[var(--color-text-muted)]">{colors[key] || "—"}</span>
            </button>
            {expandedColorKey === key && (
              <ColorWheelPicker
                value={colors[key] || "#888888"}
                onChange={(hex) => setColors((prev) => ({ ...prev, [key]: hex }))}
                size={160}
              />
            )}
          </div>
        ))}
        </>
        )}

        {settingsTab === "navegacion" && (
        <>
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">
          Navegación
        </h2>
        <p className="text-xs text-[var(--color-text-muted)]">Visibilidad, orden y etiqueta de cada sección — los miembros ven exactamente esto.</p>
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
        </>
        )}

        {error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="rounded-full border border-[var(--color-border-soft)] px-5 py-3 text-sm font-medium text-[var(--color-text-secondary)] cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-full bg-[var(--color-orange)] py-3 text-sm font-bold text-[var(--color-text-on-accent)] disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Vista previa en tiempo real — usa el mismo estado que ya se está editando (images/colors/
          theme/nav), nunca contenido de ejemplo: lo que se ve acá es exactamente lo que se va a
          guardar (ver Contexto §15 del pedido: "los cambios se deben poder previsualizar
          inmediatamente"). Es una maqueta simplificada, no un clon del AppShell real — insertar la
          app completa acá adentro para "previsualizar" duplicaría toda su lógica de datos solo
          para una vista de referencia. */}
      <div className="flex w-full flex-col gap-4 lg:sticky lg:top-6 lg:max-w-sm">
        <div className="menzo-panel p-4">
          <h2 className="mb-3 text-sm font-semibold">Vista previa en tiempo real</h2>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Escritorio</p>
          <div className="mb-4 flex overflow-hidden rounded-xl border border-[var(--color-border-soft)]" style={{ background: "#07090D" }}>
            <div
              className="flex w-24 shrink-0 flex-col gap-2 p-2.5"
              style={{
                backgroundImage: previewNavBg
                  ? `linear-gradient(rgba(7,9,13,0.9), rgba(7,9,13,0.9)), url(${previewNavBg})`
                  : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="flex items-center gap-1.5">
                {previewIcon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewIcon} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white" style={{ background: previewPrimary }}>
                    {previewName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="truncate text-[9px] font-bold">{previewName}</span>
              </div>
              {previewNavSections.map((s) => (
                <span key={s.key} className="truncate text-[8px] text-white/70">
                  {s.label}
                </span>
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="relative flex h-16 w-full flex-col justify-end p-2"
                style={{
                  backgroundImage: previewCover
                    ? `linear-gradient(rgba(7,9,13,0.15), rgba(7,9,13,0.85)), url(${previewCover})`
                    : `linear-gradient(135deg, ${previewPrimary}, ${previewSecondary})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <span className="truncate text-[9px] font-bold text-white">{previewName}</span>
              </div>
              <div className="flex flex-col gap-1 p-2">
                <div className="h-2 w-3/4 rounded-full" style={{ background: "var(--color-surface-soft)" }} />
                <div className="h-2 w-1/2 rounded-full" style={{ background: "var(--color-surface-soft)" }} />
                <span
                  className="mt-1 flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold text-white"
                  style={{ background: previewPrimary }}
                >
                  <CheckIcon size={8} /> Seguir
                </span>
              </div>
            </div>
          </div>

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Móvil</p>
          <div className="mx-auto w-32 overflow-hidden rounded-2xl border border-[var(--color-border-soft)]" style={{ background: "#07090D" }}>
            <div
              className="relative flex h-20 w-full flex-col justify-end p-2"
              style={{
                backgroundImage: previewCover
                  ? `linear-gradient(rgba(7,9,13,0.15), rgba(7,9,13,0.85)), url(${previewCover})`
                  : `linear-gradient(135deg, ${previewPrimary}, ${previewSecondary})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <span className="truncate text-[9px] font-bold text-white">{previewName}</span>
            </div>
            <div className="flex items-center justify-around border-t border-white/10 px-2 py-1.5">
              <HomeIcon size={12} className="text-white/70" />
              <UsersIcon size={12} className="text-white/70" />
              <ChatIcon size={12} className="text-white/70" />
            </div>
          </div>

          <p className="mt-3 text-[11px] text-[var(--color-text-muted)]">
            Los cambios se aplican en Web y Móvil (iOS y Android) para todos los miembros de la comunidad.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
