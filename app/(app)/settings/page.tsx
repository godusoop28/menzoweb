"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { usersApi } from "@/lib/api";
import { useAccessibilityPrefs } from "@/lib/AccessibilityPrefsContext";
import { useAppState } from "@/lib/AppStateContext";
import type { SettingsDto } from "@/lib/api";

function SettingRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {!!description && <span className="block text-xs text-[var(--color-text-muted)]">{description}</span>}
      </span>
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-[var(--color-surface-soft)] checked:bg-[var(--color-orange)] relative transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
      />
    </label>
  );
}

export default function SettingsPage() {
  const { actions } = useAppState();
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const { prefs: accessibilityPrefs, setPrefs: setAccessibilityPrefs } = useAccessibilityPrefs();

  useEffect(() => {
    usersApi
      .getSettings()
      .then(setSettings)
      .catch((error) => console.warn("[menzo/web] getSettings failed", error));
  }, []);

  function update(patch: Partial<SettingsDto>) {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
    usersApi.updateSettings(patch).catch((error) => console.warn("[menzo/web] updateSettings failed", error));
  }

  async function handleLogout() {
    await actions.logout();
    router.replace("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex items-center gap-3">
        <Image
          src="/illustrations/menzi/menzi-settings.webp"
          alt=""
          width={640}
          height={640}
          priority
          className="h-14 w-14 shrink-0 object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
        />
        <div>
          <h1 className="font-display text-2xl font-bold">Configuración</h1>
          <p className="text-xs text-[var(--color-text-muted)]">Tu cuenta, privacidad y notificaciones en un solo lugar.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Cuenta</h2>
        <Link
          href="/profile/edit"
          className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-sm font-medium"
        >
          Editar perfil
        </Link>
        <button
          onClick={handleLogout}
          className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-left text-sm font-medium text-[var(--color-coral)] cursor-pointer"
        >
          Cerrar sesión
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Apariencia</h2>
        <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 text-sm">
          <p className="font-medium">Cada chat tiene su propia apariencia</p>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            El wallpaper, el color de las burbujas, la opacidad y el tamaño de texto se personalizan desde el ícono de
            paleta dentro de cada conversación — solo vos ves esos cambios en ese chat.
          </p>
        </div>
      </div>

      {/* Por-dispositivo (no se envía a menzoapi) — ver AccessibilityPrefsContext.tsx. A
          diferencia de la apariencia de chat, esto no es expresión personal ligada a la cuenta:
          no debe reactivarse silenciosamente al cambiar de usuario en un equipo compartido. */}
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Accesibilidad</h2>
        <SettingRow
          label="Reducir fondos personalizados"
          description="Oculta las imágenes de tema de comunidad y wallpapers de chat, usando solo color."
          value={accessibilityPrefs.reduceCustomBackgrounds}
          onChange={(v) => setAccessibilityPrefs({ reduceCustomBackgrounds: v })}
        />
        <SettingRow
          label="Reducir movimiento"
          description="Detiene animaciones decorativas (como la de DJ Menzi) en este dispositivo."
          value={accessibilityPrefs.reduceMotion}
          onChange={(v) => setAccessibilityPrefs({ reduceMotion: v })}
        />
      </div>

      {settings && (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Notificaciones</h2>
            <SettingRow
              label="Notificaciones activas"
              value={settings.notificationsEnabled}
              onChange={(v) => update({ notificationsEnabled: v })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Privacidad</h2>
            <SettingRow
              label="Mostrar estado en línea"
              value={settings.showOnlineStatus}
              onChange={(v) => update({ showOnlineStatus: v })}
            />
            <SettingRow
              label="Permitir visitas al perfil"
              value={settings.allowProfileVisits}
              onChange={(v) => update({ allowProfileVisits: v })}
            />
            <SettingRow label="Mostrar intereses" value={settings.showInterests} onChange={(v) => update({ showInterests: v })} />
          </div>
        </>
      )}

      <p className="text-xs text-[var(--color-text-muted)]">Menzo Web · Conecta. Comparte. Crea.</p>
    </div>
  );
}
