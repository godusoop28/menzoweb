import type { PostBlock } from "@/lib/types";

import { blockFormatClassName } from "./BlockEditor";

/** Único renderer de `blocks` en toda la web — nunca `dangerouslySetInnerHTML`, nunca HTML
 * generado a mano: cada bloque se mapea a un elemento conocido, con el texto siempre interpolado
 * como texto JSX (React lo escapa) y las URLs siempre usadas solo como `src`. Eso es lo que hace
 * que este formato sea seguro contra inyección sin necesitar un sanitizador — ver el pedido
 * original de por qué se eligió bloques en vez de "subir el body a HTML enriquecido". El formato
 * "tipo Word" (tamaño/fuente/negrita/itálica/alineación) es solo clases CSS por eso mismo motivo:
 * nunca hay HTML de por medio, ni acá ni en BlockEditor. */
export function PostBlockRenderer({ blocks }: { blocks: PostBlock[] }) {
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block) => {
        switch (block.type) {
          case "heading":
            return (
              <h3 key={block.id} className={blockFormatClassName(block)}>
                {block.text}
              </h3>
            );
          case "paragraph":
            return (
              <p key={block.id} className={`whitespace-pre-wrap leading-relaxed ${blockFormatClassName(block)}`}>
                {block.text}
              </p>
            );
          case "image":
          case "gif":
            return (
              <div
                key={block.id}
                className={block.align === "center" ? "flex justify-center" : block.align === "right" ? "flex justify-end" : ""}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.url ?? undefined} alt={block.alt ?? ""} className="w-full rounded-2xl object-cover" loading="lazy" />
              </div>
            );
          case "divider":
            return <hr key={block.id} className="border-[var(--color-border-soft)]" />;
          default:
            return null;
        }
      })}
    </div>
  );
}
