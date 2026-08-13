export function remainingSec(endsAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((endsAtMs - nowMs) / 1000));
}

export function progressRatio(remaining: number, duration: number): number {
  if (duration <= 0) return 1;
  return Math.min(1, Math.max(0, 1 - remaining / duration));
}

export function beepSecond(remaining: number, already: ReadonlySet<number>): number | null {
  if (remaining <= 3 && remaining > 0 && !already.has(remaining)) return remaining;
  return null;
}
