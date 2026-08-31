"use client";

const VOLUME_KEY = "tabatia.volume.v1";
const DEFAULT_VOLUME = 80;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getStoredVolume(): number {
  if (!canUseStorage()) return DEFAULT_VOLUME;
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw === null) return DEFAULT_VOLUME;
    const n = Number(raw);
    if (!Number.isFinite(n)) return DEFAULT_VOLUME;
    return Math.max(0, Math.min(100, Math.round(n)));
  } catch {
    return DEFAULT_VOLUME;
  }
}

export function setStoredVolume(volume: number): void {
  if (!canUseStorage()) return;
  const clamped = Math.max(0, Math.min(100, Math.round(volume)));
  localStorage.setItem(VOLUME_KEY, String(clamped));
}
