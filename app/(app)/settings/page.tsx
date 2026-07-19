"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { usersApi } from "@/lib/api";
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
      <h1 className="font-display text-2xl font-bold">Configuración</h1>

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

      <p className="text-xs text-[var(--color-text-muted)]">Menzo Web · Volver también es avanzar.</p>
    </div>
  );
}
