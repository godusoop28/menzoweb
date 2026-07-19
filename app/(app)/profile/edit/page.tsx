"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { GradientButton } from "@/components/GradientButton";
import { auras } from "@/data/auras";
import { useAppState } from "@/lib/AppStateContext";
import { gradientCss } from "@/lib/theme";
import type { AuraId } from "@/lib/types";
import { collapseSpaces, isValidDisplayName, NAME_MAX } from "@/lib/validation";

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

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

  async function handleSave() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await actions.updateProfile(
        {
          displayName: collapseSpaces(displayName).trim(),
          bio,
          statusText,
          aura,
          avatarGradient: auras.find((a) => a.id === aura)!.gradient,
          avatarUri,
          coverUri,
        },
        { avatar: avatarFile, cover: coverFile }
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
        <div className="flex flex-col items-center gap-2">
          {coverUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUri} alt="" className="h-32 w-full rounded-2xl object-cover" />
          ) : (
            <div className="h-32 w-full rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)]" />
          )}
          <input ref={coverInputRef} type="file" accept="image/*" onChange={handleCoverFile} className="hidden" />
          <button
            onClick={() => coverInputRef.current?.click()}
            className="rounded-full border border-[var(--color-border-soft)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer"
          >
            Cambiar portada
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <Avatar name={displayName} avatarUri={avatarUri} gradient={auras.find((a) => a.id === aura)!.gradient} size={100} />
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFile} className="hidden" />
          <button
            onClick={() => avatarInputRef.current?.click()}
            className="rounded-full border border-[var(--color-border-soft)] px-4 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] cursor-pointer"
          >
            Cambiar foto
          </button>
        </div>

        <Field label="Nombre visible">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, NAME_MAX))}
            className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 outline-none"
          />
        </Field>

        <Field label="Estado">
          <input
            value={statusText}
            onChange={(e) => setStatusText(e.target.value.slice(0, 40))}
            placeholder="¿Qué estás haciendo?"
            className="w-full rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 outline-none"
          />
        </Field>

        <Field label="Biografía">
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            rows={3}
            className="w-full resize-none rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface-secondary)] px-4 py-3 outline-none"
          />
        </Field>

        <Field label="Aura">
          <div className="flex flex-wrap gap-2">
            {auras.map((a) => (
              <button
                key={a.id}
                onClick={() => setAura(a.id)}
                className={`h-10 w-10 rounded-full border-2 cursor-pointer ${aura === a.id ? "border-[var(--color-text-primary)]" : "border-transparent"}`}
                style={{ background: gradientCss(a.gradient) }}
                aria-label={a.name}
                title={a.name}
              />
            ))}
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
