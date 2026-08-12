"use client";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  return ctx;
}

/** Soft beep for last seconds / interval change. */
export function playBeep(kind: "tick" | "switch" | "done" = "tick"): void {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === "suspended") void audio.resume();

  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.connect(gain);
  gain.connect(audio.destination);

  const now = audio.currentTime;
  if (kind === "tick") {
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.start(now);
    osc.stop(now + 0.14);
  } else if (kind === "switch") {
    osc.frequency.value = 523.25;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    osc.start(now);
    osc.stop(now + 0.3);
  } else {
    osc.type = "triangle";
    osc.frequency.setValueAtTime(392, now);
    osc.frequency.setValueAtTime(523.25, now + 0.18);
    osc.frequency.setValueAtTime(659.25, now + 0.36);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    osc.start(now);
    osc.stop(now + 0.72);
  }
}

export function unlockAudio(): void {
  const audio = getCtx();
  if (audio?.state === "suspended") void audio.resume();
}
