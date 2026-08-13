import assert from "node:assert/strict";
import { test } from "node:test";
import { extractPlaylistId, extractYoutubeId } from "./youtube";

test("extracts watch, shorts, youtu.be and bare ids", () => {
  assert.equal(extractYoutubeId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYoutubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYoutubeId("https://youtu.be/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYoutubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
  assert.equal(extractYoutubeId("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=12"), "dQw4w9WgXcQ");
});

test("does not treat a playlist-only url as a video", () => {
  assert.equal(
    extractYoutubeId("https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj"),
    null,
  );
});

test("extracts playlist ids from list param and bare ids", () => {
  assert.equal(
    extractPlaylistId("https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj"),
    "PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj",
  );
  assert.equal(
    extractPlaylistId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj"),
    "PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj",
  );
  assert.equal(extractPlaylistId("PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj"), "PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj");
  assert.equal(extractPlaylistId("https://youtu.be/dQw4w9WgXcQ"), null);
});
