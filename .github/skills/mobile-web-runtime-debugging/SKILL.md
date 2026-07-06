---
name: mobile-web-runtime-debugging
description: >
  Debug browser-only failures in the mobile rehearsal player with a disciplined
  live-browser workflow. Use when tasks mention web playback failing, browser
  console or network errors, live browser window debugging, Expo web repros,
  Playwright or DevTools inspection, TrackPlayer web, Shaka, Google Drive media
  auth, blob URLs, or stale browser-session noise.
---

# Mobile Web Runtime Debugging

Use this skill for `packages/mobile-rehearsal-player` when the problem reproduces
on web or only becomes diagnosable through a live browser session.

## Goals

- Reproduce the failure on a fresh bundle and a fresh page.
- Correlate UI state, console output, and network traffic for the same user action.
- Route quickly to the owning web runtime code instead of mapping the whole playback stack.
- Separate validated code fixes from residual browser noise.

## Startup

1. Ensure the web app is running with `npm --workspace @org/mobile-rehearsal-player run web`.
2. If Metro was restarted, discard old page handles and open a new browser page.
3. Reload before each serious repro attempt so preserved console events do not masquerade as current failures.
4. Record the exact repro path before debugging. Prefer a minimal script such as `Add -> Search Google Drive -> query -> Play <track>`.

## Smart Routing

Start from the nearest owning web surface:

- `packages/mobile-rehearsal-player/src/app/library/playback/utils/saved-track-player-web-load.ts`
- `packages/mobile-rehearsal-player/src/app/library/playback/utils/saved-track-player-interop.ts`
- `packages/mobile-rehearsal-player/src/app/library/playback/utils/saved-track-playback-view-model.ts`
- `packages/mobile-rehearsal-player/src/app/library/playback/utils/saved-track-playback-controller/**`

Before editing, answer:

- Which TrackPlayer entry point is actually used by this repro: `add`, `load`, `setupPlayer`, or a controller command above them?
- Does the failing request come from raw media URL loading, a prefetch step, or the Shaka-backed `window.rntp` player?
- Is the signal tied to the current click, or is it preserved noise from a prior page state?

## Browser Debug Loop

For each attempt, capture these together:

1. UI transition: Did the mini-player, now playing surface, or error state change?
2. Console delta: Only the messages that appear after the triggering action.
3. Network delta: Request URL, method, status, initiator, and timing.

Treat recurring baseline warnings as background unless they align with the failure:

- `"shadow*"` style deprecation warnings
- `useNativeDriver is not supported`
- generic unrelated `400` resource errors

## Playback-Specific Heuristics

When the failure involves Google Drive or TrackPlayer web, check for these signatures first:

- `HEAD https://www.googleapis.com/drive/v3/files/...alt=media...` with `403`
  Meaning: the browser reached the raw Drive media URL without the required auth headers.
- `GET https://www.googleapis.com/drive/v3/files/...` blocked by ORB or browser media policy
  Meaning: the browser is still trying to stream the raw Drive URL instead of a safer authenticated path.
- `HEAD blob:...` with `ERR_METHOD_NOT_SUPPORTED`
  Meaning: Shaka or the TrackPlayer web layer is probing a blob URL through the normal load path.
- No media request at all after the click
  Meaning: the patch may not be installed, `setupPlayer` may not have run, or the controller never reached the web runtime.

Do not assume `load` is the active entry point. In this codebase, web playback can begin through `TrackPlayer.add(...)`, so verify the real call path before patching.

## Web Runtime Hot Spots

For this repo, these are the fastest places to inspect after repro:

- `saved-track-player-web-load.ts`
  Browser patching for `add`, `load`, `setupPlayer`, blob URLs, and cleanup.
- `saved-track-player-interop.ts`
  Whether the web patch is installed safely and early enough.
- `window.rntp.load(...)` and `window.rntp.getMediaElement()`
  The Shaka-backed browser touchpoints when blob-backed playback is involved.
- `saved-track-playback-view-model.ts`
  Whether Drive URLs and auth headers are constructed correctly.
- neighboring tests
  Prefer the smallest spec that encodes the browser failure mode before broad changes.

## Validation Order

After the first substantive edit:

1. Run the narrowest behavior test for the touched slice.
2. Run the smallest compile or typecheck surface that covers the touched runtime.
3. Repeat one fresh browser repro on a reloaded page.

For the current web playback surface, prefer:

- `npx tsx --test src/app/library/playback/utils/saved-track-player-web-load.spec.ts`
- `npm exec -- nx run mobile-rehearsal-player:typecheck`

Do not trust an old page with preserved events after Metro restarts. Use a fresh page or hard reload.

## Reporting

When you close out a debugging pass, report three things separately:

- what was reproduced live
- what was fixed and code-validated
- what browser noise remains unproven or unrelated

If the live browser still shows generic noise after a validated fix, say so explicitly instead of conflating it with the original failure.
