"use client";

/** Cues cortos para eventos de un LIVE (unión/salida/inicio, mic, compartir pantalla) — ver
 * lib/sound/tone.ts para el motor de síntesis compartido. */

import { playTone } from "@/lib/sound/tone";

export function playJoinSound() {
  playTone([
    { freq: 520, at: 0, duration: 0.12 },
    { freq: 720, at: 0.09, duration: 0.14 },
  ]);
}

export function playLeaveSound() {
  playTone([
    { freq: 620, at: 0, duration: 0.12 },
    { freq: 420, at: 0.09, duration: 0.16 },
  ]);
}

export function playLiveStartSound() {
  playTone(
    [
      { freq: 440, at: 0, duration: 0.1 },
      { freq: 660, at: 0.09, duration: 0.1 },
      { freq: 880, at: 0.18, duration: 0.22 },
    ],
    0.14
  );
}

/** Feedback local al tocar el propio botón de micrófono — un solo blip corto, distinto de
 * join/leave para no confundirse con alguien entrando/saliendo de la sala. */
export function playMicOnSound() {
  playTone([{ freq: 780, at: 0, duration: 0.09 }], 0.1);
}

export function playMicOffSound() {
  playTone([{ freq: 380, at: 0, duration: 0.09 }], 0.1);
}

/** Compartir pantalla — un barrido de dos notas ascendente/descendente, más largo que el blip de
 * mic para que se note que es un evento distinto (arrancar/parar de compartir, no solo mutear). */
export function playScreenShareStartSound() {
  playTone(
    [
      { freq: 500, at: 0, duration: 0.1 },
      { freq: 900, at: 0.08, duration: 0.16 },
    ],
    0.12
  );
}

export function playScreenShareStopSound() {
  playTone(
    [
      { freq: 900, at: 0, duration: 0.1 },
      { freq: 500, at: 0.08, duration: 0.16 },
    ],
    0.12
  );
}
