"use client";

/** Cue de mensaje nuevo en una sala de chat abierta — ver lib/sound/tone.ts para el motor de
 * síntesis compartido (mismo enfoque que lib/live/liveSoundEffects.ts). */

import { playTone } from "@/lib/sound/tone";

export function playMessageReceivedSound() {
  playTone([{ freq: 660, at: 0, duration: 0.08 }], 0.08);
}
