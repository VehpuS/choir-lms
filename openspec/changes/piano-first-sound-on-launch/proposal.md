## Why

Reported on an iPhone 17 Pro, in the home-screen web app: after fully closing and reopening the app, the piano makes no sound, and even before the last release the sound would sometimes lag before the first note. It works once a track has played.

Reading the code against the platform rules found three causes, two of which can be reproduced in a browser:

1. **Recordings were fetched at the first key, and a press that waited too long was thrown away.** The piano's 21 recordings only started loading when the first note was played, and a press made while they loaded sounded only if they arrived within 1.5 s. On a cold launch (nothing cached, 21 MP3s to fetch and decode on a phone) the first presses were silent, and a later press sometimes lagged. Reproduced: with slow recordings, a first key pressed after the piano opened is silent.
2. **The page never asked for the playback audio session.** iOS Safari lets Web Audio on its own follow the ringer/silent switch (the iPhone 17 Pro's Action Button is often set to it) and only makes the page audible once a media element plays, which is why the piano worked during playback and not on launch. Task 10.2 of `piano-pitch-check` found the symptom ("a page already playing media is exempt") and fixed the gesture unlock, but was not verified on a real iPhone. `navigator.audioSession.type = "playback"` is the platform's way to ask. Not reproducible in Chromium; covered by a stand-in for the API.
3. **A failed recording load was never retried.** One failed fetch among the 21 left the whole session on the fallback sound.

## What Changes

- The recordings start loading when the piano opens (before any key), so on a fresh launch they have the time it takes to reach for a key.
- A key is never silent and never late: a press before the recordings are ready sounds at once through the fallback voice; the next press after they arrive plays the recording.
- A failed load is tried again on a later press or open, at most every 10 s.
- While the piano is in use the page asks for the `playback` audio session (where the browser has one) and gives the previous type back when the piano closes, so the rest of the app does not claim the speaker.
- The gesture unlock listeners capture, so a key that stops event propagation cannot hide the gesture.
- Regression tests: unit specs for the voice, engine and audio-session lease, and three browser scenarios (`piano-samples-preload`, `piano-first-note-slow-samples`, `piano-ios-audio-rules`), each failing on the previous code.

Not included: a silent-audio-element fallback for iOS older than the Audio Session API (iOS 16.4); the iPhone 17 Pro runs a version that has it.

## Capabilities

### Modified Capabilities

- `piano-pitch-check`: the piano's first-sound behaviour on a cold start.

## Impact

`packages/mobile-rehearsal-player/src/app/library/piano/` (`sampled-piano-voice.ts`, `piano-sound-engine.ts`, `use-piano-sound.ts`, new `playback-audio-session.ts`), `tools/browser-session/` (three scenarios). No change to the keyboard, preferences or other platforms.

The fix cannot be verified on a real iPhone from CI; the maintainer's device check in `tasks.md` closes that.
