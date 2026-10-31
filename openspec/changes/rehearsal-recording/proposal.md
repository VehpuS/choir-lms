## Why

Singers practise a part against a track, but today they cannot hear themselves against it afterwards. `pitch-detection` tells them live whether a note is in tune; it keeps nothing. A recorded take, lined up with the track and playable together with it, lets a singer check timing, blend, and entrances, and compare a second attempt with a first. The microphone path built for pitch detection (`PcmSource`) was shaped for a recorder to reuse, and the `Practice tools` menu was shaped to take a third row, so this is the natural next step.

## What Changes

- Add a `Recording` tool to the `Practice tools` menu (web only for now). While a track plays, the user starts a take, sings, and stops; the take is stored with its start position in track time.
- Capture takes from the shared microphone (`PcmSource`) as unprocessed mono audio, encode them as 16-bit mono WAV, and keep them in a new local store with its own budget, separate from the offline audio cache. Takes belong to a track and can be listed, named, played alone, and deleted.
- Add overlay playback: a take plays together with its track, aligned to track time, staying in sync through play, pause, seek, and loop wrap, with a balance control between track and take.
- Add latency compensation: a default estimate from the browser, a calibration step that measures the real round trip, and a per-take nudge for the last few milliseconds.
- Give `PcmSource` a contiguous block stream beside its overlapping analysis frames, and correct its capture timestamps so they can be related to track position (the pitch-detection design assumed a clock shared with playback; there is none today).
- Add a framework-agnostic mixing package for transport sync, drift correction, alignment, and gain, written so `composite-tracks` can reuse it for stems.
- Recording is an explicit feature with its own explanation and storage rules. Pitch detection still stores nothing and its guard test is unchanged.

Not in this change: punch ranges tied to markers and loops, exporting a mixed overlay, saving takes to Drive, native iOS and Android (handed to `native-playback-follow-ups`), recording at a shaped speed or pitch.

## Capabilities

### New Capabilities

- `rehearsal-recording`: offering the tool, consent and indicator, recording a take against a playing track, local storage under the track, managing takes, and safe stopping.
- `take-overlay-playback`: playing a take together with its track in sync, the balance control, latency compensation and calibration, and the rules when speed or pitch shaping is active.

### Modified Capabilities

None. `pitch-detection` requirements are unchanged; the `PcmSource` changes are internal.

## Impact

- `packages/mobile-rehearsal-player`: `library/pitch/pcm-source*.ts` (block stream, timestamps), new `library/recording/` (recorder, take store, WAV encoder, UI), `library/practice-tools/` (third row), playback integration for the overlay.
- New package `packages/audio-mixing` (framework-agnostic sync and gain logic; depends on `audio-library-models`), and take types in `audio-library-models`.
- Storage: a new IndexedDB database for takes on web; the offline `AudioStore` and its budget are not touched.
- Dependencies: none expected; the WAV encoder is small enough to write in the repo.
- Docs: README and CLAUDE.md workspace layout (new package), `docs/mobile-cross-platform-audio-playback.md` (overlay path).
- Related: `composite-tracks` (shared mixer), `native-playback-follow-ups` (native recording).
