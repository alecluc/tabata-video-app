export type IntervalKind = "work" | "rest";

export interface Interval {
  id: string;
  name: string;
  kind: IntervalKind;
  durationSec: number;
  /** YouTube URL or video id; empty for rest */
  youtubeUrl: string;
}

export interface Routine {
  id: string;
  name: string;
  rounds: number;
  intervals: Interval[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSnapshot {
  round: number;
  intervalIndex: number;
  remainingSec: number;
  elapsedSec: number;
  paused: boolean;
}

export function createId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyInterval(kind: IntervalKind = "work"): Interval {
  return {
    id: createId(),
    name: kind === "rest" ? "Descanso" : "Ejercicio",
    kind,
    durationSec: kind === "rest" ? 10 : 20,
    youtubeUrl: "",
  };
}

export function emptyRoutine(name = "Nueva rutina"): Routine {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name,
    rounds: 1,
    intervals: [
      emptyInterval("work"),
      emptyInterval("rest"),
      emptyInterval("work"),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

export function totalDurationSec(routine: Routine): number {
  const block = routine.intervals.reduce((sum, i) => sum + i.durationSec, 0);
  return block * Math.max(1, routine.rounds);
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
