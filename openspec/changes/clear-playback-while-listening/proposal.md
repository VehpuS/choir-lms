## Status

**Draft, findings only.** Written to hand over what was learned and ruled out while chasing this on a real iPhone, so a new exploration (based on how existing DAWs and audio apps keep Bluetooth output clear while recording) starts from facts and not from scratch. No solution is chosen here. The experimental settings from `microphone-choice` stay in the app until a solution replaces them.

## Why

Reported on an iPhone 17 Pro, in the home-screen web app, with Bluetooth earbuds: **while a microphone is open (pitch detection or recording), playback sounds fine for a second or two after it starts and then turns into a thin, "cheap speaker" sound.** It happens on every new song in a queue and on every resume after a pause, even with nothing sung into the microphone. It does not happen with the iPhone's own speaker. It does not happen with only a track or only the piano, so it is tied to a microphone being open. (Wired headphones could not be tried: the phone has no jack.) A screen recording of it sounded clean.

The app's job is rehearsal: hearing the track clearly while singing against it, and recording over it. A singer on Bluetooth earbuds, which is most singers on a phone, gets a degraded rehearsal exactly when pitch detection or recording is on.

## What Was Found

See `design.md` for the evidence. In short:

- The degradation starts after the page's own audio leaves the page (a screen recording does not hear it, the browser scenarios, which read the Web Audio output, cannot see it), at the platform's audio route and Bluetooth stage.
- It matches iOS moving Bluetooth earbuds from the high-quality stereo output mode (A2DP, output only) to the hands-free call mode (HFP, mono, narrowband) once a microphone is capturing, re-negotiated each time output starts.
- Every lever a web page has was tried: none avoided it (`design.md`, "Tried"). The page cannot set iOS's Bluetooth options (for example allowing A2DP while recording).

## What Changes

Nothing in code. This change records the findings and frames the exploration; the spec holds the requirement a solution must meet. The exploration (tasks 2.x) is expected to decide between a web-only mitigation, a native audio path with explicit session options, or documenting the limit.

## Capabilities

### New Capabilities

- `clear-playback-while-listening`: playback stays clear for a person on Bluetooth earbuds while pitch detection or recording is on.

## Impact

None yet. Likely areas: `components/audio-session/`, `library/pitch/pcm-source.web.ts`, the recording engine, and, for a native path, `native-playback-follow-ups` (native has no microphone capture today).
