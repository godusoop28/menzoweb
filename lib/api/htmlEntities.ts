/** El backend sanitiza el texto de usuario escapándolo a entidades HTML (emojis → `&#x1f338;`,
 * apóstrofes → `&#39;`, etc.). React ya escapa todo al renderizar, así que acá se decodifica de
 * vuelta para que se vea el texto real — decodificar nunca inyecta HTML porque ningún texto de la
 * API se renderiza con innerHTML. */
const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

const ENTITY = /&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g;

export function decodeHtmlEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(ENTITY, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n >= 0 && n <= 0x10ffff ? String.fromCodePoint(n) : match;
    }
    return NAMED[code] ?? match;
  });
}

/** Reviver para JSON.parse — decodifica cada string de la respuesta. */
export function decodeEntitiesReviver(_key: string, value: unknown) {
  return typeof value === "string" ? decodeHtmlEntities(value) : value;
}
