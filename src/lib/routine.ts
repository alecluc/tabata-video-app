import type { Interval, Routine } from "./types";
import {
  betweenRoundsRestDefault,
  emptyInterval,
  intervalEffectiveDurationSec,
} from "./types";

export interface FlatStep {
  round: number;
  /** Index into routine.intervals, or -1 for synthetic between-round rest. */
  intervalIndex: number;
  /** Synthetic pause between rounds (not stored in intervals[]). */
  betweenRounds?: boolean;
}

export function clampDuration(sec: number, fallback = 20): number {
  const n = Number(sec);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(5, Math.min(600, Math.round(n)));
}

export function flattenRoutine(routine: Routine): FlatStep[] {
  const list: FlatStep[] = [];
  const rounds = Math.max(1, routine.rounds);
  const intervals = routine.intervals;
  const lastIsRest = intervals.length > 0 && intervals[intervals.length - 1].kind === "rest";
  const betweenSec = betweenRoundsRestDefault(routine);
  const insertBetween = rounds > 1 && !lastIsRest && betweenSec > 0;

  for (let r = 1; r <= rounds; r++) {
    for (let i = 0; i < intervals.length; i++) {
      list.push({ round: r, intervalIndex: i });
    }
    if (insertBetween && r < rounds) {
      list.push({ round: r, intervalIndex: -1, betweenRounds: true });
    }
  }
  return list;
}

/** Resolve the interval shown for a flattened step (synthetic between-round rest included). */
export function resolveFlatInterval(routine: Routine, step: FlatStep): Interval {
  if (step.betweenRounds) {
    return {
      id: `between-rounds-${step.round}`,
      name: "Entre rondas",
      kind: "rest",
      durationSec: betweenRoundsRestDefault(routine),
      youtubeUrl: "",
    };
  }
  return routine.intervals[step.intervalIndex]!;
}

export function stepDurationSec(routine: Routine, step: FlatStep): number {
  const interval = resolveFlatInterval(routine, step);
  return intervalEffectiveDurationSec(interval);
}

/** Next work interval after `fromStep` (for rest video preview). */
export function findNextWorkInterval(
  routine: Routine,
  flat: FlatStep[],
  fromStep: number,
): Interval | null {
  for (let i = fromStep + 1; i < flat.length; i++) {
    const meta = flat[i];
    if (meta.betweenRounds) continue;
    const interval = routine.intervals[meta.intervalIndex];
    if (interval?.kind === "work") return interval;
  }
  return null;
}

/**
 * Side label for bilateral work.
 * alternate_rounds: odd = Derecha, even = Izquierda
 * double_time: first half Derecha, second half Izquierda
 */
export function bilateralSideLabel(
  interval: Interval,
  round: number,
  remainingSec: number,
  effectiveDuration: number,
): string | null {
  if (interval.kind !== "work" || interval.laterality !== "bilateral") return null;
  const mode = interval.bilateralMode ?? "double_time";
  if (mode === "alternate_rounds") {
    return round % 2 === 1 ? "Derecha" : "Izquierda";
  }
  const half = effectiveDuration / 2;
  const elapsed = effectiveDuration - remainingSec;
  return elapsed < half ? "Derecha" : "Izquierda";
}

export function buildPlaylistIntervals(
  videos: { videoId: string; title: string }[],
  opts: { workSec: number; restSec: number; insertRest: boolean },
): Interval[] {
  const work = clampDuration(opts.workSec, 20);
  const rest = clampDuration(opts.restSec, 10);
  const intervals: Interval[] = [];

  videos.forEach((video, index) => {
    intervals.push({
      ...emptyInterval("work"),
      name: video.title.trim() || `Ejercicio ${index + 1}`,
      durationSec: work,
      youtubeUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      laterality: "single",
    });
    if (opts.insertRest && index < videos.length - 1) {
      intervals.push({
        ...emptyInterval("rest"),
        durationSec: rest,
      });
    }
  });

  return intervals;
}
