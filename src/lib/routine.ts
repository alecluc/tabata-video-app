import type { Interval, Routine } from "./types";
import {
  BILATERAL_SIDE_PAUSE_SEC,
  betweenRoundsRestDefault,
  emptyInterval,
  intervalEffectiveDurationSec,
} from "./types";

export { BILATERAL_SIDE_PAUSE_SEC };

export interface FlatStep {
  round: number;
  /** Index into routine.intervals, or -1 for synthetic between-round rest. */
  intervalIndex: number;
  /** Synthetic pause between rounds (not stored in intervals[]). */
  betweenRounds?: boolean;
  /** Synthetic 5s pause between bilateral halves (double_time). */
  betweenSides?: boolean;
  /** First or second half of a bilateral double_time work interval. */
  bilateralHalf?: "first" | "second";
}

export function clampDuration(sec: number, fallback = 20): number {
  const n = Number(sec);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(5, Math.min(600, Math.round(n)));
}

function isBilateralDoubleTime(interval: Interval): boolean {
  return (
    interval.kind === "work" &&
    interval.laterality === "bilateral" &&
    (interval.bilateralMode ?? "double_time") === "double_time"
  );
}

function pushIntervalSteps(list: FlatStep[], round: number, intervalIndex: number, interval: Interval) {
  if (isBilateralDoubleTime(interval)) {
    list.push({ round, intervalIndex, bilateralHalf: "first" });
    list.push({ round, intervalIndex, betweenSides: true });
    list.push({ round, intervalIndex, bilateralHalf: "second" });
    return;
  }
  list.push({ round, intervalIndex });
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
      pushIntervalSteps(list, r, i, intervals[i]!);
    }
    if (insertBetween && r < rounds) {
      list.push({ round: r, intervalIndex: -1, betweenRounds: true });
    }
  }
  return list;
}

/** Resolve the interval shown for a flattened step (synthetic rests included). */
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
  if (step.betweenSides) {
    return {
      id: `between-sides-${step.round}-${step.intervalIndex}`,
      name: "Cambio de lado",
      kind: "rest",
      durationSec: BILATERAL_SIDE_PAUSE_SEC,
      youtubeUrl: "",
    };
  }
  return routine.intervals[step.intervalIndex]!;
}

export function stepDurationSec(routine: Routine, step: FlatStep): number {
  if (step.betweenSides) return BILATERAL_SIDE_PAUSE_SEC;
  const interval = resolveFlatInterval(routine, step);
  if (step.bilateralHalf) {
    return Math.max(1, Math.round(interval.durationSec / 2));
  }
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
    if (meta.betweenRounds || meta.betweenSides) continue;
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
export function bilateralSideLabel(interval: Interval, step: FlatStep): string | null {
  if (interval.kind !== "work" || interval.laterality !== "bilateral") return null;
  const mode = interval.bilateralMode ?? "double_time";
  if (mode === "alternate_rounds") {
    return step.round % 2 === 1 ? "Derecha" : "Izquierda";
  }
  if (step.betweenSides) return null;
  if (step.bilateralHalf === "first") return "Derecha";
  if (step.bilateralHalf === "second") return "Izquierda";
  return null;
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
