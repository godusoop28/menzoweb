import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Menzo",
  description: "Conecta, comparte y descubre gente con tus mismos intereses.",
  icons: { icon: "/branding/favicon.png" },
};

// viewportFit: "cover" es lo que hace que env(safe-area-inset-*) deje de valer 0 en iOS Safari —
// sin esto, todo el padding de safe-area en la app (input del chat, tab bar, etc.) es inerte.
// interactiveWidget: "resizes-visual" hace que Chrome Android encoja window.visualViewport (no el
// layout viewport) cuando aparece el teclado — sin esto, dvh no se entera del teclado en Android y
// cualquier posicionamiento "sticky" cerca del fondo queda en un punto arbitrario. useAppHeight()
// (ver lib/useAppHeight.ts) escucha ese visualViewport y expone --app-height para el chat.
export const viewport: Viewport = {
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable} h-full`}>
      <body className="min-h-full font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
