import assert from "node:assert/strict";
import { test } from "node:test";
import { beepSecond, progressRatio, remainingSec } from "./timer";

test("remaining never goes negative and ceils up", () => {
  assert.equal(remainingSec(1000, 1000), 0);
  assert.equal(remainingSec(1000, 1500), 0);
  assert.equal(remainingSec(2500, 1000), 2);
  assert.equal(remainingSec(2000, 1000), 1);
});

test("progress is clamped", () => {
  assert.equal(progressRatio(10, 20), 0.5);
  assert.equal(progressRatio(-1, 20), 1);
  assert.equal(progressRatio(20, 20), 0);
  assert.equal(progressRatio(5, 0), 1);
});

test("beeps each of the last 3 seconds once", () => {
  const seen = new Set<number>();
  assert.equal(beepSecond(4, seen), null);
  assert.equal(beepSecond(3, seen), 3);
  seen.add(3);
  assert.equal(beepSecond(3, seen), null);
  assert.equal(beepSecond(0, seen), null);
});
