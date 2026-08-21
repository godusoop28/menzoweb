"use client";

/** Motor compartido de tonos cortos sintetizados con Web Audio API — sin archivos de audio de por
 * medio (este entorno no tiene acceso a internet para bajar una librería de efectos reales), así
 * que en vez de un asset binario se generan tonos simples con envolvente (mismo espíritu que el
 * "blip" corto de Discord/Slack). Extraído de liveSoundEffects.ts para que cualquier otra parte de
 * la app (chat, notificaciones) pueda sintetizar sus propios cues sin duplicar este motor. Si más
 * adelante se agregan archivos .mp3/.wav reales al proyecto, esto se reemplaza por esos assets sin
 * tocar los puntos donde se llama. */

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

export function playTone(notes: { freq: number; at: number; duration: number }[], gainPeak = 0.12) {
  const ctx = getContext();
  if (!ctx) return;
  // El navegador suspende el AudioContext hasta la primera interacción real del usuario — mismo
  // motivo que el autoplay bloqueado del audio remoto (ver LiveAutoplayBar); acá simplemente no
  // suena hasta que haya habido esa interacción, nunca lanza un error visible.
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  for (const { freq, at, duration } of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + at);
    gain.gain.linearRampToValueAtTime(gainPeak, now + at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + at + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + at);
    osc.stop(now + at + duration + 0.02);
  }
}
