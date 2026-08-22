"use client";

import { useEffect, useMemo, useState } from "react";

/** Los 9 tokens de color del pack (ver manifest.json.colorTokens) — mismo shape que
 * PetResponse.colors en menzoapi. */
export type MenzoPetColors = {
  primary: string;
  secondary: string;
  markings: string;
  eyes: string;
  outline?: string;
  hair: string;
  accessoryPrimary: string;
  accessorySecondary: string;
  accessoryAccent: string;
  effect: string;
};

export type MenzoPetEquipment = Partial<Record<"hair" | "body" | "neck" | "head" | "face" | "audio" | "effect", string>>;

type ManifestItem = { id: string; slot: string; file: string; name: string };
type ManifestSpecies = { id: string; base: string };
type Manifest = { species: ManifestSpecies[]; items: ManifestItem[] };

const OUTLINE = "#17111E";

/** Recoloreo para la capa BASE de la especie — acá "#FF7A1A" significa "primary" (color de
 * cuerpo). Ver auditoría: los SVG de especie y los de accesorios comparten el mismo hex crudo
 * "#FF7A1A" con DOS significados distintos, así que no puede haber un único mapa global (bug
 * confirmado en la referencia del pack: recoloreaba accesorios con "primary" en vez de
 * "accessoryAccent" en cuanto alguien tocaba el color primario). */
const SPECIES_TOKEN_MAP: [string, keyof MenzoPetColors][] = [
  ["#FF7A1A", "primary"],
  ["#FFE7CF", "secondary"],
  ["#FFB53A", "markings"],
  ["#7B4DFF", "eyes"],
  [OUTLINE, "outline"],
];

/** Recoloreo para capas de ÍTEM/ACCESORIO (hair/body/neck/head/face/audio/effect) — acá
 * "#FF7A1A" significa "accessoryAccent", no "primary". */
const ITEM_TOKEN_MAP: [string, keyof MenzoPetColors][] = [
  ["#FF7A1A", "accessoryAccent"],
  [OUTLINE, "outline"],
  ["#2B2234", "hair"],
  ["#17131F", "accessoryPrimary"],
  ["#3B285C", "accessorySecondary"],
  ["#8A55FF", "effect"],
];

function recolorSvg(svg: string, colors: MenzoPetColors, tokenMap: [string, keyof MenzoPetColors][]) {
  let out = svg;
  for (const [token, key] of tokenMap) {
    const value = colors[key];
    if (value) out = out.split(token).join(value);
  }
  // Los SVG del pack traen width/height fijos en px (1024x1024) en su propio tag raíz — sin esto
  // el <svg> inyectado ignora el tamaño del contenedor y se renderiza a tamaño nativo (bug
  // confirmado en la referencia: el prop `size` del componente no tenía ningún efecto).
  out = out.replace(/width="1024"\s+height="1024"/, 'width="100%" height="100%"');
  return out;
}

function SvgLayer({ src, colors, isSpecies, zIndex }: { src: string; colors: MenzoPetColors; isSpecies: boolean; zIndex: number }) {
  const [svg, setSvg] = useState<string>("");
  useEffect(() => {
    let alive = true;
    fetch(src)
      .then((r) => r.text())
      .then((text) => alive && setSvg(recolorSvg(text, colors, isSpecies ? SPECIES_TOKEN_MAP : ITEM_TOKEN_MAP)))
      .catch(() => alive && setSvg(""));
    return () => {
      alive = false;
    };
  }, [src, colors, isSpecies]);

  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, zIndex, pointerEvents: "none" }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

/** Miniatura de UN SOLO ítem del catálogo (sin la capa de especie base) — reusa el mismo
 * `SvgLayer` (fetch + recoloreo) que las capas normales de `MenzoPet`, para la grilla de
 * accesorios de /pets/customize en vez del botón de solo texto que había antes. No necesita el
 * manifest completo: el caller (la página de personalización) ya conoce el `file` de cada ítem
 * porque lo levantó una sola vez para armar la grilla entera. */
export function MenzoPetItemThumb({
  assetRoot = "/pets",
  file,
  colors,
  size = 56,
}: {
  assetRoot?: string;
  file: string;
  colors: MenzoPetColors;
  size?: number;
}) {
  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      <SvgLayer src={`${assetRoot}/${file}`} colors={colors} isSpecies={false} zIndex={0} />
    </div>
  );
}

export function MenzoPet({
  assetRoot = "/pets",
  species,
  colors,
  equipment = {},
  size = 280,
}: {
  assetRoot?: string;
  species: string;
  colors: MenzoPetColors;
  equipment?: MenzoPetEquipment;
  size?: number;
}) {
  const [manifest, setManifest] = useState<Manifest | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${assetRoot}/manifest.json`)
      .then((r) => r.json())
      .then((data) => alive && setManifest(data))
      .catch(() => alive && setManifest(null));
    return () => {
      alive = false;
    };
  }, [assetRoot]);

  const layers = useMemo(() => {
    if (!manifest) return [];
    const s = manifest.species.find((x) => x.id === species);
    if (!s) return [];

    // Orden recomendado del README del pack: effect, base, hair, body, neck, head, face, audio.
    const z: Record<string, number> = { effect: 0, hair: 15, body: 20, neck: 25, head: 30, face: 35, audio: 40 };
    const result: { src: string; z: number; isSpecies: boolean }[] = [
      { src: `${assetRoot}/${s.base}`, z: 10, isSpecies: true },
    ];

    for (const [slot, itemId] of Object.entries(equipment)) {
      if (!itemId) continue;
      const item = manifest.items.find((x) => x.id === itemId);
      if (item) result.push({ src: `${assetRoot}/${item.file}`, z: z[slot] ?? 20, isSpecies: false });
    }
    return result.sort((a, b) => a.z - b.z);
  }, [manifest, assetRoot, species, equipment]);

  return (
    <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}>
      {layers.map((l, i) => (
        <SvgLayer key={`${l.src}-${i}`} src={l.src} colors={colors} isSpecies={l.isSpecies} zIndex={l.z} />
      ))}
    </div>
  );
}
