import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bilateralSideLabel,
  buildPlaylistIntervals,
  findNextWorkInterval,
  flattenRoutine,
  resolveFlatInterval,
  stepDurationSec,
} from "./routine";
import type { Interval, Routine } from "./types";
import { intervalEffectiveDurationSec, totalDurationSec } from "./types";

test("inserts rest between videos but not after the last", () => {
  const intervals = buildPlaylistIntervals(
    [
      { videoId: "aaaaaaaaaaa", title: "Uno" },
      { videoId: "bbbbbbbbbbb", title: "Dos" },
    ],
    { workSec: 20, restSec: 10, insertRest: true },
  );
  assert.equal(intervals.length, 3);
  assert.equal(intervals[0].kind, "work");
  assert.equal(intervals[1].kind, "rest");
  assert.equal(intervals[2].kind, "work");
  assert.equal(intervals[2].name, "Dos");
});

test("skips rests when the option is off", () => {
  const intervals = buildPlaylistIntervals([{ videoId: "aaaaaaaaaaa", title: "Uno" }], {
    workSec: 30,
    restSec: 10,
    insertRest: false,
  });
  assert.equal(intervals.length, 1);
  assert.equal(intervals[0].durationSec, 30);
});

test("flattens rounds in order", () => {
  const routine = {
    id: "r",
    name: "x",
    rounds: 2,
    createdAt: "",
    updatedAt: "",
    intervals: [
      { id: "a", name: "A", kind: "work", durationSec: 20, youtubeUrl: "" },
      { id: "b", name: "B", kind: "rest", durationSec: 10, youtubeUrl: "" },
    ],
  } satisfies Routine;
  const flat = flattenRoutine(routine);
  assert.deepEqual(flat, [
    { round: 1, intervalIndex: 0 },
    { round: 1, intervalIndex: 1 },
    { round: 2, intervalIndex: 0 },
    { round: 2, intervalIndex: 1 },
  ]);
});

test("injects between-round rest when block does not end with rest", () => {
  const routine = {
    id: "r",
    name: "x",
    rounds: 2,
    betweenRoundsRestSec: 15,
    createdAt: "",
    updatedAt: "",
    intervals: [
      { id: "a", name: "A", kind: "work", durationSec: 20, youtubeUrl: "https://youtu.be/aaaaaaaaaaa" },
      { id: "b", name: "B", kind: "work", durationSec: 20, youtubeUrl: "https://youtu.be/bbbbbbbbbbb" },
    ],
  } satisfies Routine;
  const flat = flattenRoutine(routine);
  assert.deepEqual(flat, [
    { round: 1, intervalIndex: 0 },
    { round: 1, intervalIndex: 1 },
    { round: 1, intervalIndex: -1, betweenRounds: true },
    { round: 2, intervalIndex: 0 },
    { round: 2, intervalIndex: 1 },
  ]);
  const mid = resolveFlatInterval(routine, flat[2]);
  assert.equal(mid.kind, "rest");
  assert.equal(mid.durationSec, 15);
  assert.equal(mid.name, "Entre rondas");
  assert.equal(totalDurationSec(routine), 20 + 20 + 15 + 20 + 20);
});

test("does not inject between-round rest when last interval is rest", () => {
  const routine = {
    id: "r",
    name: "x",
    rounds: 2,
    betweenRoundsRestSec: 10,
    createdAt: "",
    updatedAt: "",
    intervals: [
      { id: "a", name: "A", kind: "work", durationSec: 20, youtubeUrl: "" },
      { id: "b", name: "B", kind: "rest", durationSec: 10, youtubeUrl: "" },
    ],
  } satisfies Routine;
  const flat = flattenRoutine(routine);
  assert.equal(flat.some((s) => s.betweenRounds), false);
});

test("finds next work video across rest and between-round steps", () => {
  const routine = {
    id: "r",
    name: "x",
    rounds: 2,
    betweenRoundsRestSec: 10,
    createdAt: "",
    updatedAt: "",
    intervals: [
      { id: "a", name: "A", kind: "work", durationSec: 20, youtubeUrl: "https://youtu.be/aaaaaaaaaaa" },
      { id: "b", name: "B", kind: "work", durationSec: 20, youtubeUrl: "https://youtu.be/bbbbbbbbbbb" },
    ],
  } satisfies Routine;
  const flat = flattenRoutine(routine);
  const next = findNextWorkInterval(routine, flat, 1);
  assert.equal(next?.name, "A");
  assert.equal(findNextWorkInterval(routine, flat, flat.length - 1), null);
});

test("double_time doubles effective duration; alternate keeps base", () => {
  const double: Interval = {
    id: "1",
    name: "Curl",
    kind: "work",
    durationSec: 20,
    youtubeUrl: "",
    laterality: "bilateral",
    bilateralMode: "double_time",
  };
  const alt: Interval = {
    ...double,
    bilateralMode: "alternate_rounds",
  };
  assert.equal(intervalEffectiveDurationSec(double), 40);
  assert.equal(intervalEffectiveDurationSec(alt), 20);
  assert.equal(bilateralSideLabel(alt, 1, 10, 20), "Derecha");
  assert.equal(bilateralSideLabel(alt, 2, 10, 20), "Izquierda");
  assert.equal(bilateralSideLabel(double, 1, 35, 40), "Derecha");
  assert.equal(bilateralSideLabel(double, 1, 10, 40), "Izquierda");
});

test("stepDurationSec uses effective duration for work steps", () => {
  const routine = {
    id: "r",
    name: "x",
    rounds: 1,
    createdAt: "",
    updatedAt: "",
    intervals: [
      {
        id: "a",
        name: "A",
        kind: "work",
        durationSec: 20,
        youtubeUrl: "",
        laterality: "bilateral",
        bilateralMode: "double_time",
      },
    ],
  } satisfies Routine;
  assert.equal(stepDurationSec(routine, { round: 1, intervalIndex: 0 }), 40);
});
