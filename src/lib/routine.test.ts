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
import {
  BILATERAL_SIDE_PAUSE_SEC,
  intervalEffectiveDurationSec,
  prepSecDefault,
  totalDurationSec,
} from "./types";

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
  assert.equal(totalDurationSec(routine), 10 + 20 + 20 + 15 + 20 + 20);
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

test("double_time splits into halves with 5s pause; alternate keeps base", () => {
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
  assert.equal(intervalEffectiveDurationSec(double), 25);
  assert.equal(intervalEffectiveDurationSec(alt), 20);
  assert.equal(bilateralSideLabel(alt, { round: 1, intervalIndex: 0 }), "Derecha");
  assert.equal(bilateralSideLabel(alt, { round: 2, intervalIndex: 0 }), "Izquierda");
  assert.equal(
    bilateralSideLabel(double, { round: 1, intervalIndex: 0, bilateralHalf: "first" }),
    "Derecha",
  );
  assert.equal(
    bilateralSideLabel(double, { round: 1, intervalIndex: 0, bilateralHalf: "second" }),
    "Izquierda",
  );
});

test("flattens bilateral double_time into three steps per interval", () => {
  const routine = {
    id: "r",
    name: "x",
    rounds: 1,
    prepSec: 0,
    createdAt: "",
    updatedAt: "",
    intervals: [
      {
        id: "a",
        name: "Curl",
        kind: "work",
        durationSec: 20,
        youtubeUrl: "",
        laterality: "bilateral",
        bilateralMode: "double_time",
      },
    ],
  } satisfies Routine;
  const flat = flattenRoutine(routine);
  assert.deepEqual(flat, [
    { round: 1, intervalIndex: 0, bilateralHalf: "first" },
    { round: 1, intervalIndex: 0, betweenSides: true },
    { round: 1, intervalIndex: 0, bilateralHalf: "second" },
  ]);
  assert.equal(stepDurationSec(routine, flat[0]), 10);
  assert.equal(stepDurationSec(routine, flat[1]), BILATERAL_SIDE_PAUSE_SEC);
  assert.equal(stepDurationSec(routine, flat[2]), 10);
  const pause = resolveFlatInterval(routine, flat[1]);
  assert.equal(pause.kind, "rest");
  assert.equal(pause.name, "Cambio de lado");
});

test("stepDurationSec uses effective duration for non-bilateral work steps", () => {
  const routine = {
    id: "r",
    name: "x",
    rounds: 1,
    prepSec: 0,
    createdAt: "",
    updatedAt: "",
    intervals: [
      {
        id: "a",
        name: "A",
        kind: "work",
        durationSec: 20,
        youtubeUrl: "",
      },
    ],
  } satisfies Routine;
  assert.equal(stepDurationSec(routine, { round: 1, intervalIndex: 0 }), 20);
});

test("prepSecDefault and totalDurationSec include prep", () => {
  const routine = {
    id: "r",
    name: "x",
    rounds: 1,
    prepSec: 15,
    createdAt: "",
    updatedAt: "",
    intervals: [
      { id: "a", name: "A", kind: "work", durationSec: 20, youtubeUrl: "" },
    ],
  } satisfies Routine;
  assert.equal(prepSecDefault(routine), 15);
  assert.equal(prepSecDefault({}), 10);
  assert.equal(totalDurationSec(routine), 15 + 20);
});
