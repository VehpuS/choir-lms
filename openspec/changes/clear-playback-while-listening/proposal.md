## Status

**Cause found on the device; fix proposed, scope to confirm (2026-11-15).** The first draft recorded findings only. A second pass read WebKit's source and native audio projects and concluded the fix had to be native. The maintainer then retested a browser DAW (Soundtrap) on a phone: it plays while recording without the problem. So a web fix exists, and this change now looks for it in the web app. The native findings are kept in `native-playback-follow-ups`.

## Why

Reported on an iPhone 17 Pro, in the home-screen web app, with Bluetooth earbuds: **while a microphone is open (pitch detection or recording), playback sounds fine for a second or two after it starts and then turns into a thin, "cheap speaker" sound.** It happens on every new song in a queue and on every resume after a pause, even with nothing sung into the microphone. It does not happen with the iPhone's own speaker, and not with only a track or only the piano. A screen recording of it sounded clean.

The app's job is rehearsal: hearing the track clearly while singing against it. A singer on Bluetooth earbuds, which is most singers on a phone, gets a degraded rehearsal exactly when pitch detection or recording is on.

## What Was Found

Details and sources are in `design.md`.

- **The audio session type is not the lever.** While a page captures, WebKit uses play-and-record in the video chat mode with the Bluetooth hands-free profile allowed, whatever `navigator.audioSession.type` says. This is why none of the "Sound while listening" settings did anything.
- **A browser DAW on the same engine does not have the problem,** so those fixed options do not force the thin sound by themselves. Something in how this app plays and captures brings it out.
- **This app differs from a browser DAW in specific ways:** tracks play through a media element and not through Web Audio; the microphone has its own audio context with its own (silent) output, next to up to three other contexts; the chosen input was requested softly and never read back; and the page sets a session type. The symptom resetting on every song start points first at the media element.
- **Two paths in the app already resemble a DAW:** composite tracks play through Web Audio only, and a track whose pitch has been shifted plays through an audio context. Trying those with pitch detection on needs no code and narrows the cause.

## What Changes

Device results (2026-11-15), with pitch detection on and the same earbuds: a composite track, which plays through Web Audio, stays clear; a single track stays thin even when its media element is routed through an audio context. So a playing media element is the trigger while a microphone is open, and the capture side and the session type are left alone.

1. **Proposed fix, to be written as its own change once its scope is confirmed:** while a microphone is open on iPhone and iPad browsers, single tracks play through the Web Audio engine that composites use, and go back to the media element when the microphone closes or the app is hidden. Costs and open choices (mono or stereo, recording, the preparing wait) are in `design.md`, Decision 2.
2. **In this change:** remove the "Sound while listening" setting; a notice where the microphone is turned on in iPhone and iPad browsers until the fix covers the case; a WebKit bug report.

## Capabilities

### New Capabilities

- `clear-playback-while-listening`: playback stays clear for a person on Bluetooth earbuds while pitch detection or recording is on, or the app says plainly that it cannot.

## Impact

- This change: `components/audio-session/` (removal of `audio-route-store` and the `AudioRoute` branches), Settings > Microphone and the microphone prompt (notice), `tools/browser-session` (`microphone-audio-route` removed, a scenario for the notice), the playback doc.
- The follow-on change: `library/composite/engine/`, `composite/prepared/`, `composite/playback/` (the player seam) and the queue's loading path in `library/playback/`; possibly `library/recording/` for a transport over the engine's clock.
- `native-playback-follow-ups` 1.12 and 1.13: the native session findings are recorded there.
- No new dependencies.
