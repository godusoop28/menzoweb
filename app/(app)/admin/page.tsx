"use client";

import Link from "next/link";

import { useAppState } from "@/lib/AppStateContext";
import { BellIcon, CheckIcon, ChatIcon, CrownIcon, EyeIcon, EyeOffIcon, UsersIcon } from "@/components/icons";

const LINKS = [
  { href: "/admin/users", label: "Usuarios", description: "Buscar cuentas, suspender o eliminar.", icon: UsersIcon },
  { href: "/admin/posts", label: "Publicaciones", description: "Buscar, ocultar o eliminar publicaciones.", icon: EyeIcon },
  { href: "/admin/roles", label: "Roles", description: "Asignar o revocar Curador/Líder.", icon: CrownIcon },
  {
    href: "/admin/security/moderation-queue",
    label: "Cola de moderación",
    description: "Contenido marcado automáticamente por la pipeline de seguridad.",
    icon: CheckIcon,
  },
];

const MASTER_LINKS = [
  {
    href: "/admin/moderation-log",
    label: "Log de moderación",
    description: "Historial completo de acciones de staff, con motivo.",
    icon: ChatIcon,
  },
  {
    href: "/admin/security/audit-log",
    label: "Registro de seguridad",
    description: "Eventos automáticos: rate limit, spam, subidas rechazadas, imágenes flaggeadas.",
    icon: EyeOffIcon,
  },
];

export default function AdminDashboardPage() {
  const { state } = useAppState();
  const isMaster = state.profile?.globalRole === "MASTER";
  const links = isMaster ? [...LINKS, ...MASTER_LINKS] : LINKS;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <CrownIcon size={28} className="text-[var(--color-orange)]" />
        <div>
          <h1 className="font-display text-2xl font-bold">Panel de administración</h1>
          <p className="text-xs text-[var(--color-text-muted)]">
            {isMaster
              ? "Control total, excepto lectura de chats privados."
              : "Herramientas de moderación de la comunidad."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 transition-colors hover:bg-[var(--color-surface-secondary)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-secondary)]">
                <Icon size={20} />
              </span>
              <span>
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-xs text-[var(--color-text-muted)]">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </div>

      {!isMaster && (
        <p className="flex items-center gap-2 rounded-xl bg-[var(--color-surface-secondary)] p-3 text-xs text-[var(--color-text-muted)]">
          <BellIcon size={14} />
          Toda acción con motivo queda registrada y es visible para el usuario maestro.
        </p>
      )}
    </div>
  );
}
