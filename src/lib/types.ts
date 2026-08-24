export type IntervalKind = "work" | "rest";

/** Unique exercise vs left+right. */
export type Laterality = "single" | "bilateral";

/**
 * How bilateral work is scheduled:
 * - double_time: configured duration ×2 so both sides fit in one interval
 * - alternate_rounds: odd rounds = right, even = left
 */
export type BilateralMode = "double_time" | "alternate_rounds";

export interface Interval {
  id: string;
  name: string;
  kind: IntervalKind;
  durationSec: number;
  /** YouTube URL or video id; empty for rest */
  youtubeUrl: string;
  /** Default single when omitted (legacy routines). */
  laterality?: Laterality;
  /** Only meaningful when laterality === "bilateral". */
  bilateralMode?: BilateralMode;
}

export interface Routine {
  id: string;
  name: string;
  rounds: number;
  intervals: Interval[];
  /**
   * Rest injected between round N and N+1 when the block does not already
   * end with a rest. Defaults to 10 when omitted.
   */
  betweenRoundsRestSec?: number;
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
    laterality: kind === "work" ? "single" : undefined,
  };
}

export function emptyRoutine(name = "Nueva rutina"): Routine {
  const now = new Date().toISOString();
  return {
    id: createId(),
    name,
    rounds: 1,
    betweenRoundsRestSec: 10,
    intervals: [
      emptyInterval("work"),
      emptyInterval("rest"),
      emptyInterval("work"),
    ],
    createdAt: now,
    updatedAt: now,
  };
}

/** Duration of one work/rest row as written (before rounds / between-round inject). */
export function intervalEffectiveDurationSec(interval: Interval): number {
  if (
    interval.kind === "work" &&
    interval.laterality === "bilateral" &&
    interval.bilateralMode === "double_time"
  ) {
    return interval.durationSec * 2;
  }
  return interval.durationSec;
}

export function betweenRoundsRestDefault(routine: Pick<Routine, "betweenRoundsRestSec">): number {
  const n = routine.betweenRoundsRestSec;
  if (n === undefined || n === null) return 10;
  const num = Number(n);
  if (!Number.isFinite(num)) return 10;
  return Math.max(0, Math.min(600, Math.round(num)));
}

export function totalDurationSec(routine: Routine): number {
  const block = routine.intervals.reduce((sum, i) => sum + intervalEffectiveDurationSec(i), 0);
  const rounds = Math.max(1, routine.rounds);
  const last = routine.intervals[routine.intervals.length - 1];
  const lastIsRest = last?.kind === "rest";
  const betweenSec = betweenRoundsRestDefault(routine);
  const betweenTotal =
    rounds > 1 && !lastIsRest && betweenSec > 0 ? betweenSec * (rounds - 1) : 0;
  return block * rounds + betweenTotal;
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
