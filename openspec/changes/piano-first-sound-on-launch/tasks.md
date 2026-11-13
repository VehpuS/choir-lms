## 1. Reproduce first

- [x] 1.1 Browser scenarios, each failing on the previous build: `piano-samples-preload` (0 of 21 recordings requested at app start, with the piano never opened; also fails with the warm-up call removed; and opening the piano must fetch nothing more), `piano-first-note-slow-samples` (a key pressed while the recordings load: "heard nothing", the reported symptom), `piano-ios-audio-rules` (no playback audio session requested)
- [x] 1.2 Unit specs for the new contract: voice (a press during the load sounds at once through the fallback; none lost however long the recordings take; the recordings are used once ready; a failed load retries, but not at once), engine (prime starts the load, none for the organ; the audio session is requested on prime or press and given back on dispose), audio-session lease (six cases)

## 2. Fix

- [x] 2.1 `sampled-piano-voice.ts`: no queue and no 1.5 s limit; fallback while not ready; retry after `LOAD_RETRY_MS`
- [x] 2.4 App-start warm-up (asked for by the maintainer: "can't the app preload the recording?"): `piano-sample-cache.ts` (four specs), `warm-piano-samples.ts` (three specs: waits for idle, skips data-saver, cancellable), `use-piano-sample-warmup.ts`, `piano-sample-sources.web.ts` through the cache, `App` runs the warm-up
- [x] 2.2 `piano-sound-engine.ts`: `prime()` creates the voice (starts the load); `audioSession` lease requested in `ensureContext`, released in `dispose`
- [x] 2.3 `playback-audio-session.ts` and its wiring in `use-piano-sound.ts`; capture-phase unlock listeners

- [x] 2.5 Regression (reported on the iPhone after the release): pitch detection said "No microphone found" with the piano open. Reproduced first by `pitch-with-piano-ios-audio-session` (failed with exactly that message). `components/audio-session/` (`audio-session-arbiter.ts`, eight specs; `web-audio-session.ts`); the piano uses its `playbackLease`, `pcm-source.web.ts` holds `holdCapture()` for the life of the microphone (released on failure, on an ended stream and on close, including a context that cannot be created). Replaces `piano/playback-audio-session.ts`

## 3. Verify

- [x] 3.1 The three scenarios and the unit specs pass; the other piano scenarios and the full default lane still pass
- [ ] 3.2 Maintainer, on the iPhone home-screen app: fully close and reopen the app, open the piano, press a key. Try it with the phone's silent mode on and off, and once with a track already played, and report which of these were silent before and after this build. Also, with the piano open, turn Pitch detection on and then Record: both should find the microphone (and say so if not). If the piano is still silent, say which of: silent in every case; silent only in silent mode; silent only for the first key after opening
