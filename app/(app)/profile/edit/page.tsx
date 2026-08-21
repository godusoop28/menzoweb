"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { CameraIcon, CheckIcon, CloseIcon } from "@/components/icons";
import { GradientButton } from "@/components/GradientButton";
import { ColorWheelPicker } from "@/components/ui/ColorWheelPicker";
import { ApiError } from "@/lib/api";
import { useAppState } from "@/lib/AppStateContext";
import { Colors, gradientCss } from "@/lib/theme";
import { useUsernameAvailability } from "@/lib/useUsernameAvailability";
import { collapseSpaces, isValidDisplayName, isValidUsernameShape, NAME_MAX, USERNAME_MAX } from "@/lib/validation";

const BACKGROUND_COLORS: string[] = [
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
  const [username, setUsername] = useState(profile.username);
  const [bio, setBio] = useState(profile.bio);
  const [statusText, setStatusText] = useState(profile.statusText);
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri);
  const [avatarFile, setAvatarFile] = useState<File | undefined>();
  const [coverUri, setCoverUri] = useState(profile.coverUri);
  const [coverFile, setCoverFile] = useState<File | undefined>();
  const [backgroundUri, setBackgroundUri] = useState(profile.backgroundUri);
  const [backgroundFile, setBackgroundFile] = useState<File | undefined>();
  const [backgroundColor, setBackgroundColor] = useState(profile.backgroundColor);
  const [showCustomBackground, setShowCustomBackground] = useState(false);
  const [bubbleColor, setBubbleColor] = useState(profile.bubbleColor ?? "#1E2A38");
  const [bubbleBorderColor, setBubbleBorderColor] = useState(profile.bubbleBorderColor ?? "#FF7A1A");
  const [bubbleCustomized, setBubbleCustomized] = useState(!!profile.bubbleColor);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameShapeValid = isValidUsernameShape(username);
  const usernameStatus = useUsernameAvailability(usernameShapeValid ? username : "", profile.username);
  const usernameOk = username === profile.username || (usernameShapeValid && usernameStatus === "available");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);

  const valid = isValidDisplayName(displayName) && usernameShapeValid && usernameOk;

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
          username: username !== profile.username ? username : undefined,
          bio,
          statusText,
          avatarUri,
          coverUri,
          backgroundUri: finalBackgroundUri,
          backgroundColor: finalBackgroundColor,
          bubbleColor: bubbleCustomized ? bubbleColor : "",
          bubbleBorderColor: bubbleCustomized ? bubbleBorderColor : "",
        },
        { avatar: avatarFile, cover: coverFile, background: backgroundFile }
      );
      router.push("/profile");
    } catch (e) {
      console.warn("[menzo/web] updateProfile failed", e);
      setError(e instanceof ApiError ? e.message : "No pudimos guardar los cambios. Revisa tu conexión e inténtalo de nuevo.");
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
              <div className="h-40 w-full rounded-2xl shadow-lg" style={{ background: gradientCss(profile.avatarGradient) }} />
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
              <Avatar name={displayName} avatarUri={avatarUri} gradient={profile.avatarGradient} size={92} />
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

        <Field label="Nickname">
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 transition-colors focus-within:border-[var(--color-orange)]">
            <span className="text-[var(--color-text-muted)]">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().slice(0, USERNAME_MAX))}
              className="flex-1 bg-transparent outline-none"
            />
            {username !== profile.username && usernameShapeValid && usernameStatus === "checking" && (
              <span className="text-xs text-[var(--color-text-muted)]">Buscando…</span>
            )}
            {username !== profile.username && usernameShapeValid && usernameStatus === "available" && (
              <CheckIcon size={16} className="text-[var(--color-green)]" />
            )}
            {username !== profile.username && usernameShapeValid && (usernameStatus === "taken" || usernameStatus === "error") && (
              <CloseIcon size={14} className="text-[var(--color-coral)]" />
            )}
          </div>
          {username.length > 0 && !usernameShapeValid && (
            <p className="mt-1 text-xs text-[var(--color-coral)]">
              Entre 3 y {USERNAME_MAX} caracteres — solo minúsculas, números, puntos o guiones bajos.
            </p>
          )}
          {username !== profile.username && usernameShapeValid && usernameStatus === "taken" && (
            <p className="mt-1 text-xs text-[var(--color-coral)]">Ese nickname ya está en uso.</p>
          )}
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

        <Field label="Tu burbuja de chat">
          <p className="mb-2 text-xs text-[var(--color-text-muted)]">
            Así van a ver tus mensajes los demás — el color de fondo y el brillo del borde son tuyos, en cualquier sala.
          </p>
          <label className="mb-3 flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={bubbleCustomized}
              onChange={(e) => setBubbleCustomized(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-orange)]"
            />
            Personalizar mi burbuja
          </label>
          {bubbleCustomized && (
            <div className="flex flex-col gap-4">
              <div
                className="w-fit max-w-[80%] self-end rounded-[20px] rounded-tr-lg px-4 py-2 text-sm text-white"
                style={{
                  background: bubbleColor,
                  border: `1.5px solid ${bubbleBorderColor}`,
                  boxShadow: `0 0 14px -2px ${bubbleBorderColor}`,
                }}
              >
                Así se ve tu burbuja
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Fondo</span>
                  <ColorWheelPicker value={bubbleColor} onChange={setBubbleColor} size={148} />
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">Borde (brillo)</span>
                  <ColorWheelPicker value={bubbleBorderColor} onChange={setBubbleBorderColor} size={148} />
                </div>
              </div>
            </div>
          )}
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
              <button
                type="button"
                onClick={() => setShowCustomBackground((v) => !v)}
                className="relative h-8 w-8 shrink-0 cursor-pointer rounded-full border-2 border-dashed border-[var(--color-border-strong)]"
                style={
                  backgroundColor && !BACKGROUND_COLORS.includes(backgroundColor) ? { background: backgroundColor, borderStyle: "solid" } : undefined
                }
                title="Elegir cualquier color"
                aria-label="Elegir cualquier color de fondo"
              >
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-[var(--color-text-muted)]">
                  {backgroundColor && !BACKGROUND_COLORS.includes(backgroundColor) ? "" : "+"}
                </span>
              </button>
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
            {showCustomBackground && (
              <ColorWheelPicker value={backgroundColor || "#111111"} onChange={handlePickBackgroundColor} size={148} />
            )}
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
