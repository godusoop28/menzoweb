import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
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
