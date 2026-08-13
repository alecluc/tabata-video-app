import assert from "node:assert/strict";
import { test } from "node:test";
import { buildPlaylistIntervals, flattenRoutine } from "./routine";
import type { Routine } from "./types";

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
