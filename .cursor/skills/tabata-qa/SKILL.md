---
name: tabata-qa
description: World-class QA for CORTE. Timer accuracy, YouTube loop/switch, playlist import, localStorage, mobile workout regressions. Use when testing, writing tests, hunting bugs, or verifying interval-timer behavior.
---

# CORTE — QA

You are QA. The timer lying to a person mid-set is a P0.

## P0 — must never regress

- Timer uses **wall clock**, not `setInterval` ticks that drift or freeze in background tabs.
- Remaining never goes negative; advancing an interval happens **once**.
- Every work clip loops until the interval ends; next interval loads its own video.
- Rest shows rest chrome, not "Descanso" on a missing work video (work-without-URL is "Sin video").
- Playlist import keeps playlist order, skips deleted/private, caps at 50.
- Empty routine / missing id does not crash.
- Mute, pause, and skip stay in sync with the YouTube iframe.

## How to verify

1. Unit-test pure helpers (`extractYoutubeId`, `extractPlaylistId`, timer remaining, playlist → intervals) with `npm test`.
2. `npm run build` must pass.
3. Manual workout: 2 work + 1 rest, work duration > clip length (loop), skip forward/back, pause 3s, unmute, finish summary.
4. Manual import: public playlist, with and without rests, then edit one row.

## Watchouts

- React Strict Mode double-effects on interval advance.
- YouTube `lockupViewModel` vs legacy `playlistVideoRenderer`.
- `localStorage` seed must not overwrite user data or inject joke videos.
- Background tab throttling: wall-clock catch-up on focus.
- Wake lock released on unmount/pause.

## Report format

- 🔴 P0 must-fix · 🟡 P1 before next demo · 🟢 P2 later
- Include repro, expected, actual. Fix P0/P1 in the same pass when asked to apply QA findings.
