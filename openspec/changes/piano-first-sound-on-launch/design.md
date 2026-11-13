## Context

`usePianoSound` creates the audio context and, on every `pointerup`, `touchend`, `click` or `keydown`, calls `engine.prime()` to resume it (task 10.2). A press before the context runs is held and sounded on unlock. The `Piano` sound is 21 MP3 recordings, fetched and decoded by `createSampledPianoVoice`, which until now was created by the first `startNote`.

## Decisions

- **Preload at prime.** `engine.prime()` creates the voice for the current sound, which starts `load()`. Decoding does not need a running context, so this works before the first gesture. The organ has nothing to load.
- **Never silent, never late.** While the recordings are not ready a press goes to the fallback (organ) voice at once, instead of being queued behind them with a 1.5 s limit. The alternatives were a longer queue (a note that lags) or keeping the limit (the bug). The cost is that the first notes after a cold launch can sound as the organ; with the preload this only happens if a key is reached within the load time. A note held when the recordings arrive stays on the organ until released.
- **Retry.** After a failed load, `load()` may start again once `LOAD_RETRY_MS` (10 s) has passed, so every gesture does not refetch 21 files on a dead network.
- **Audio session lease.** `createPlaybackAudioSessionLease` sets `navigator.audioSession.type` to `playback` on the first prime or press and puts the previous type back on `dispose` (the last consumer leaving). Feature-detected; refused or absent means no change. `playback` also interrupts other apps' audio, which is why it is held only while the piano is in use.
- **Capture listeners** for the unlock events on `document`.

## Verification

- Browser scenarios run in Chromium with stand-ins for what iOS does and Chromium does not: slowed recordings; an `AudioContext` that starts suspended and only resumes when `resume()` is called synchronously inside a qualifying gesture; a recording `navigator.audioSession`. They assert the loading starts at open, a key pressed mid-load is heard, the first key on a fresh launch is heard under those rules, and the session is requested and given back.
- Not reproducible here: the silent switch itself and the real Safari audio stack. The device check (a fresh launch of the home-screen app with the phone in silent mode, then not) tells whether cause 2 was the reported one.
