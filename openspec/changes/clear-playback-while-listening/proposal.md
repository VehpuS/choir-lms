## Status

**Cause found on the device; fix designed, not yet built (2026-11-15).** This change went from findings, through a wrong turn (a native-only conclusion drawn from WebKit's source), to device checks that located the cause. It now holds the full scope of the fix, in two stages.

## Why

Reported on an iPhone 17 Pro, in the home-screen web app, with Bluetooth earbuds: **while a microphone is open (pitch detection or recording), playback sounds fine for a second or two after it starts and then turns into a thin, "cheap speaker" sound.** It happens on every new song in a queue and on every resume after a pause, even with nothing sung into the microphone. It does not happen with the iPhone's own speaker, and not with only a track or only the piano.

The app's job is rehearsal: hearing the track clearly while singing against it, and recording over it. A singer on Bluetooth earbuds, which is most singers on a phone, gets a degraded rehearsal exactly when pitch detection or recording is on.

## What Was Found

Details and sources are in `design.md`.

- **A playing media element is the trigger while a microphone is open.** On the maintainer's phone and earbuds, with pitch detection on: a single track is thin, and stays thin when its element is routed through an audio context; a composite track, which plays from Web Audio with no media element, is clear. Without a microphone the single track is clear.
- **The audio session type is not a lever.** While a page captures, WebKit fixes the session whatever `navigator.audioSession.type` says, which is why none of the "Sound while listening" settings did anything.
- **The app already has a player that is not affected:** the Web Audio engine behind composite tracks, which sits behind the same player seam as the media element.

## What Changes

One rule: **while a microphone is open, a track plays through the Web Audio engine; otherwise through the media element, as today.** The media element stays for playback without a microphone because it alone plays in the background and on the lock screen, starts at once without preparing or storing anything, and is stereo.

**Stage 1: pitch detection.**

- A single track can play on the engine as a one-stem item while staying the same track to the rest of the app (queue, loops, markers, lyrics, sheet music, waveform, media session).
- Prepared audio for single tracks: the same local store composites use, with a budget (500 MB by default, least recently played removed first) and a group in the offline files view.
- Loading and hand-over: a track that loads while a microphone is open starts on the engine; turning listening on or off during a track switches at the current position; hiding the app hands the track back to the media element so background playback continues.
- While a microphone is open, tracks are mono (accepted as the first step); stereo is a follow-up.
- The "Sound while listening" setting is removed.

**Stage 2: recording.**

- A recording transport over the engine's clock, so a take over a track follows the engine; the track is handed to the engine before the take starts and never switches during it.
- Clock anchors and output latency rechecked on the device against the click calibration.

Both stages apply on every web browser, not only on iPhone and iPad, so the path is the one CI and the desktop exercise.

## Capabilities

### New Capabilities

- `clear-playback-while-listening`: playback keeps its normal quality while pitch detection or recording is on, by playing from Web Audio while a microphone is open.

## Impact

- `packages/mobile-rehearsal-player`:
  - new `library/playback/listening-engine/` (single-track engine loader, hand-over, prepare-ahead, budget);
  - `library/composite/playback/` (the active-engine registry learns what kind of item it plays; the player wrapper serves both), `composite/prepared/` (owner ids for single tracks, listing by group), `composite/engine/` (position for a context time);
  - `library/playback/utils/saved-track-playback-controller/` (the load branch), `practice-tools/`, the Mix panel's visibility;
  - `library/pitch/` and `library/recording/` (what opens and closes a microphone drives the rule; `recording-transport.web.ts` gains the engine transport);
  - `components/audio-session/` (removal of `audio-route-store` and the `AudioRoute` branches), Settings > Microphone, the offline files view.
- `tools/browser-session`: scenarios for each switch, the preparing state, the budget group and a take recorded over the engine; `microphone-audio-route` is removed.
- `docs/mobile-cross-platform-audio-playback.md`: the two strategies and the rule.
- `native-playback-follow-ups` 1.12 and 1.13: the native session findings are recorded there.
- No new dependencies.
