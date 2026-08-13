import type { Interval, Routine } from "./types";
import { emptyInterval } from "./types";

export interface FlatStep {
  round: number;
  intervalIndex: number;
}

export function flattenRoutine(routine: Routine): FlatStep[] {
  const list: FlatStep[] = [];
  const rounds = Math.max(1, routine.rounds);
  for (let r = 1; r <= rounds; r++) {
    for (let i = 0; i < routine.intervals.length; i++) {
      list.push({ round: r, intervalIndex: i });
    }
  }
  return list;
}

export function clampDuration(sec: number, fallback = 20): number {
  const n = Number(sec);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(5, Math.min(600, Math.round(n)));
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
