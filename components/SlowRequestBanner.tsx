"use client";

import { useEffect, useState } from "react";

import { onSlowRequestChange } from "@/lib/api";

/** Sin esto la app se ve "trabada"/rota durante un cold-start de Render (o cualquier pedido
 * lento) — onSlowRequestChange ya existía en lib/api/client.ts pero nadie lo escuchaba en la UI,
 * así que no había ninguna señal de que el backend estaba despertando y no de que algo se había
 * roto. Se monta una sola vez en el layout raíz para cubrir también login/registro, no solo el
 * área autenticada. */
export function SlowRequestBanner() {
  const [slow, setSlow] = useState(false);

  useEffect(() => onSlowRequestChange(setSlow), []);

  if (!slow) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-[var(--color-orange)] px-4 py-2 text-center text-sm font-medium text-white shadow-md">
      <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/60 border-t-white" />
      Menzo está despertando el servidor, esto puede tardar unos segundos…
    </div>
  );
}
