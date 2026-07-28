"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { CameraIcon } from "@/components/icons";
import { GradientButton } from "@/components/GradientButton";
import { auras } from "@/data/auras";
import { useAppState } from "@/lib/AppStateContext";
import { Colors, gradientCss } from "@/lib/theme";
import type { AuraId } from "@/lib/types";
import { collapseSpaces, isValidDisplayName, NAME_MAX } from "@/lib/validation";

const BACKGROUND_COLORS = [
  Colors.orange,
  Colors.coral,
  Colors.blue,
  Colors.purple,
  Colors.green,
  Colors.cyan,
  Colors.yellow,
];

export default function EditProfilePage() {
  const { state, actions } = useAppState();
  const router = useRouter();
  const profile = state.profile!;

  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [statusText, setStatusText] = useState(profile.statusText);
  const [aura, setAura] = useState<AuraId>(profile.aura);
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri);
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [coverUri, setCoverUri] = useState(profile.coverUri);
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const [backgroundUri, setBackgroundUri] = useState(profile.backgroundUri);
  const [backgroundFile, setBackgroundFile] = useState<File | undefined>();
  const [backgroundColor, setBackgroundColor] = useState(profile.backgroundColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const valid = isValidDisplayName(displayName);

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUri(URL.createObjectURL(file));
    setAvatarFile(file);
  }

  function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUri(URL.createObjectURL(file));
    setCoverFile(file);
  }

  function handleBackgroundFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBackgroundUri(URL.createObjectURL(file));
    setBackgroundFile(file);
    setBackgroundColor(undefined);
  }

  function handlePickBackgroundColor(color: string) {
    setBackgroundColor(color);
    setBackgroundUri(undefined);
    setBackgroundFile(undefined);
  }

  function handleClearBackground() {
    setBackgroundUri(undefined);
    setBackgroundFile(undefined);
    setBackgroundColor(undefined);
  }

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      // "" limpia el campo en el backend; solo se manda si el usuario tenía algo puesto antes
      // y lo quitó (si nunca hubo nada, no hace falta mandar el PATCH de ese campo).
      const finalBackgroundUri = backgroundUri ?? (profile.backgroundUri ? "" : undefined);
      const finalBackgroundColor = backgroundColor ?? (profile.backgroundColor ? "" : undefined);
      await actions.updateProfile(
        {
          displayName: collapseSpaces(displayName).trim(),
          bio,
          statusText,
          aura,
          avatarGradient: auras.find((a) => a.id === aura)!.gradient,
          avatarUri,
          coverUri,
          backgroundUri: finalBackgroundUri,
          backgroundColor: finalBackgroundColor,
        },
        { avatar: avatarFile, cover: coverFile, background: backgroundFile }
      );
      router.push("/profile");
    } catch (e) {
      console.warn("[menzo/web] updateProfile failed", e);
      setError("No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 md:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Editar perfil</h1>
        <button onClick={() => router.back()} className="text-sm text-[var(--color-text-muted)] cursor-pointer">
          Cancelar
        </button>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <div className="relative">
            {coverUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUri} alt="" className="h-40 w-full rounded-2xl object-cover shadow-lg" />
            ) : (
              <div className="h-40 w-full rounded-2xl shadow-lg" style={{ background: gradientCss(auras.find((a) => a.id === aura)!.gradient) }} />
            )}
            <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
            <button
              onClick={() => coverInputRef.current?.click()}
              aria-label="Cambiar portada"
              title="Cambiar portada"
              className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/70 cursor-pointer"
            >
              <CameraIcon size={17} />
            </button>
          </div>

          <div className="-mt-12 flex justify-center">
            <div className="relative rounded-full shadow-xl ring-4 ring-[var(--color-background)]">
              <Avatar name={displayName} avatarUri={avatarUri} gradient={auras.find((a) => a.id === aura)!.gradient} size={92} />
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
              <button
                onClick={() => avatarInputRef.current?.click()}
                aria-label="Cambiar foto de perfil"
                title="Cambiar foto de perfil"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-black/70 cursor-pointer"
              >
                <CameraIcon size={15} />
              </button>
            </div>
          </div>
        </div>

        <Field label="Nombre visible">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, NAME_MAX))}
            className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-orange)]"
          />
        </Field>

        <Field label="Estado">
          <input
            value={statusText}
            onChange={(e) => setStatusText(e.target.value.slice(0, 40))}
            placeholder="¿Qué estás haciendo?"
            className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-orange)]"
          />
        </Field>

        <Field label="Biografía">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 outline-none transition-colors focus:border-[var(--color-orange)]"
          />
        </Field>

        <Field label="Aura">
          <div className="flex flex-wrap gap-2">
            {auras.map((a) => (
              <button
                key={a.id}
                onClick={() => setAura(a.id)}
                className={`h-10 w-10 rounded-full border-2 shadow-md transition-transform cursor-pointer hover:scale-110 ${
                  aura === a.id ? "border-[var(--color-text-primary)] scale-110" : "border-transparent"
                }`}
                style={{ background: gradientCss(a.gradient) }}
                aria-label={a.name}
                title={a.name}
              />
            ))}
          </div>
        </Field>

        <Field label="Fondo del perfil">
          <div className="flex flex-col gap-3">
            {(backgroundUri || backgroundColor) && (
              <div
                className="h-20 w-full rounded-xl bg-cover bg-center"
                style={
                  backgroundUri
                    ? { backgroundImage: `url(${backgroundUri})` }
                    : { background: backgroundColor }
                }
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => handlePickBackgroundColor(color)}
                  className={`h-8 w-8 rounded-full border-2 shadow-sm transition-transform cursor-pointer hover:scale-110 ${
                    backgroundColor === color ? "border-[var(--color-text-primary)] scale-110" : "border-transparent"
                  }`}
                  style={{ background: color }}
                  aria-label={`Fondo color ${color}`}
                />
              ))}
              <input ref={backgroundInputRef} type="file" accept="image/*" onChange={handleBackgroundFile} className="hidden" />
              <button
                onClick={() => backgroundInputRef.current?.click()}
                className="rounded-full border border-[var(--color-border-soft)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] cursor-pointer"
              >
                Subir foto
              </button>
              {(backgroundUri || backgroundColor) && (
                <button
                  onClick={handleClearBackground}
                  className="rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-coral)] cursor-pointer"
                >
                  Quitar fondo
                </button>
              )}
            </div>
          </div>
        </Field>

        {!!error && <p className="text-sm text-[var(--color-coral)]">{error}</p>}

        <GradientButton label="Guardar cambios" onClick={handleSave} disabled={!valid} loading={saving} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      {children}
    </label>
  );
}
