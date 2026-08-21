"use client";

/** Cues cortos para unión/salida/inicio de un LIVE — sintetizados con Web Audio API, sin archivos
 * de audio de por medio: este entorno no tiene acceso a internet para bajar una librería de
 * efectos de sonido real, así que en vez de inventar un asset binario se generan tonos simples
 * con envolvente (mismo espíritu que el "blip" corto de Discord/Slack al entrar/salir de una
 * llamada). Si más adelante se agregan archivos .mp3/.wav reales al proyecto, esto se reemplaza
 * por esos assets sin tocar los puntos donde se llama (ver LiveRoomContext). */

let sharedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!sharedContext) sharedContext = new Ctor();
  return sharedContext;
}

function playTone(notes: { freq: number; at: number; duration: number }[], gainPeak = 0.12) {
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
