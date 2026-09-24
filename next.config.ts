import type { NextConfig } from "next";

// Cabeceras de seguridad para toda la web. La CSP es deliberadamente acotada (sin script-src/
// connect-src): Agora, YouTube, Cloudinary y Tenor cargan desde muchos dominios dinámicos y una
// lista blanca rota rompería LIVE/música sin avisar. Lo que sí fija es lo que no tiene costo:
// nadie puede embeber Menzo en un iframe ajeno (clickjacking), ni plugins, ni cambiar <base>.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
  // Micrófono y pantalla solo para las salas en vivo propias; el resto apagado.
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self), display-capture=(self)" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Todo menos el reproductor de menzomovil (que tiene su propia política de Referer abajo).
        source: "/((?!menzi-player\\.html).*)",
        headers: securityHeaders,
      },
      {
        // Página estática del reproductor de YouTube para menzomovil (ver
        // public/menzi-player.html) — sin esto, el navegador podría degradar el Referer que
        // llega a los recursos internos de youtube.com por debajo de lo que la meta tag
        // "referrer" del propio HTML ya pide; el header HTTP es la fuente de verdad, la meta
        // tag es el respaldo. Nunca "no-referrer" ni "same-origin": eso elimina el Referer hacia
        // youtube.com y reproduce el mismo error 153 que esta página existe para evitar.
        source: "/menzi-player.html",
        headers: [
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
