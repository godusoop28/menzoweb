import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Panel derecho contextual — wrapper compartido para el rail de ~320px que aparece en lg:+ en
 * Home, Chats, Miembros, Perfil, etc. (ver Contexto §3 del pedido de rediseño: "PANEL DERECHO
 * CONTEXTUAL"). Antes cada pantalla repetía este mismo `<aside className="hidden lg:flex ...">`
 * a mano (ver el commit que lo extrae de app/(app)/page.tsx) — centralizarlo evita que el ancho/
 * gap se desincronicen entre pantallas.
 */
export function ContextSidebar({ children }: { children: ReactNode }) {
  return <aside className="hidden lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:gap-4">{children}</aside>;
}

/** Una tarjeta del panel derecho (p. ej. "Líderes", "Salas en vivo", "En línea ahora"). `action`
 * es el link "Ver todos" opcional que aparece a la derecha del título. */
export function ContextSidebarSection({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  action?: { label: string; href: string };
  children: ReactNode;
}) {
  return (
    <div className="menzo-panel flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 font-display text-sm font-bold">
          {icon}
          {title}
        </h3>
        {action && (
          <Link href={action.href} className="shrink-0 text-xs font-semibold text-[var(--color-cyan)] hover:underline">
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
