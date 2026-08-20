// Menciones (@usuario) resaltadas en el color de acento — usado tanto en ChatBubble como en
// WallMessageCard (ver Contexto §6 y §10 del pedido de rediseño: "las menciones deben verse
// claramente" en chats y en el muro). Solo resalte visual: no hay forma de resolver
// @username -> userId acá sin un fetch extra por mensaje, así que no se linkean (evita inventar
// un mapeo que no viene de la API).
const MENTION_PATTERN = /(@[a-zA-Z0-9_]{2,32})/g;

export function renderWithMentions(text: string, accentColor: string) {
  const parts = text.split(MENTION_PATTERN);
  if (parts.length === 1) return text;
  // split() con un grupo capturante intercala las coincidencias en los índices impares — no se
  // vuelve a testear el regex acá para no depender de su `lastIndex` (con la flag `g` es stateful
  // entre llamadas, un `.test()` repetido da falsos negativos intermitentes).
  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="font-semibold" style={{ color: accentColor }}>
        {part}
      </span>
    ) : (
      <span key={index}>{part}</span>
    )
  );
}
