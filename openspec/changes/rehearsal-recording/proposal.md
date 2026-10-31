## Why

Singers practise a part against a track, but today they cannot hear themselves against it afterwards. `pitch-detection` tells them live whether a note is in tune; it keeps nothing. A recorded take, lined up with the track and playable together with it, lets a singer check timing, blend, and entrances, and compare a second attempt with a first. The microphone path built for pitch detection (`PcmSource`) was shaped for a recorder to reuse, and the `Practice tools` menu was shaped to take a third row, so this is the natural next step.

## What Changes

- Add a `Recording` tool to the `Practice tools` menu (web only for now). While a track plays, the user starts a take, sings, and stops by hand at any point, so a take can cover any segment of the song or an active loop. The take is stored with a timeline that maps its audio to track positions, and the strip and the takes list show the markers around it.
- Speed and pitch shaping affect only the background track, and they stay fixed for the duration of a take (the user adjusts first, then records) and again whenever the take is played with its track: selecting a take applies its stored speed and pitch and locks those controls. To hear a take at another speed, export a mixdown and use the ordinary track controls. A take is always recorded and played at its natural speed and pitch, and can be recorded and overlaid while the track is sped up, slowed, or transposed.
- Capture takes from the shared microphone (`PcmSource`) as unprocessed mono audio, encode them as 16-bit mono WAV, and keep them in a new local store with its own budget, separate from the offline audio cache. Takes belong to a track and can be listed, named, played alone, and deleted.
- Add overlay playback: a take plays together with its track, aligned to track time, staying in sync through play, pause, seek, and loop wrap, with a balance control between track and take.
- Add latency compensation: a default estimate from the browser, a per-take nudge that is quick to use and can be saved as the device default (the convenient manual path), and an opt-in click calibration that measures the real round trip.
- Make each take a self-contained entry: when it is recorded, store a snapshot of the original track (Drive file id, name, content version, duration), the loop and markers in play, and the shaping and punch range in effect, so the entry stays meaningful when the track, its markers, or its loops later change.
- Keep the original track's audio with each take, as part of the offline storage, so the overlay and the mixdown still work after the track is replaced or removed.
- Add export, either as a download to the device or as new Drive files after the user confirms a destination folder: the bare recording (WAV, no background track), and a mixdown of the take over the original track as it was heard while recording, including its speed, pitch, loop passes, and punch range. Both use the existing narrow write permission and a resumable upload for files beyond the current 25 MB limit.
- As the last slice, add punch ranges: arming a take to start and stop at a marker or at a loop's ends. Manual start and stop always stay available.
- Give `PcmSource` a contiguous block stream beside its overlapping analysis frames, and correct its capture timestamps so they can be related to track position (the pitch-detection design assumed a clock shared with playback; there is none today).
- Add a framework-agnostic mixing package for transport sync, drift correction, alignment, and gain, written so `composite-tracks` can reuse it for stems.
- Recording is an explicit feature with its own explanation and storage rules. Pitch detection still stores nothing and its guard test is unchanged.

Not in this change: compressed export formats (MP3, AAC), stretching a take to a different track speed, native iOS and Android (handed to `native-playback-follow-ups`).

## Capabilities

### New Capabilities

- `rehearsal-recording`: offering the tool, consent and indicator, recording a take against a playing track at any shaping, manual segments and loop takes, marker context, local storage under the track, managing takes, safe stopping, and punch ranges.
- `take-overlay-playback`: playing a take together with its track in sync, the balance control, latency compensation by estimate, nudge, and opt-in calibration, loop passes, and how an unshaped take behaves against a shaped track.

- `take-export`: exporting a bare recording and a mixdown as a download or to new Drive files, the entry snapshot and kept original they rely on, destination confirmation, permission, progress, and failure states.

### Modified Capabilities

None. `pitch-detection` requirements are unchanged; the `PcmSource` changes are internal.

## Impact

- `packages/mobile-rehearsal-player`: `library/pitch/pcm-source*.ts` (block stream, timestamps), new `library/recording/` (recorder, take store, WAV encoder, UI), `library/practice-tools/` (third row), playback integration for the overlay.
- New package `packages/audio-mixing` (framework-agnostic sync and gain logic; depends on `audio-library-models`), and take types in `audio-library-models`.
- Storage: a new IndexedDB database for takes on web; the offline `AudioStore` and its budget are not touched.
- Google Drive: `packages/google-drive` gains a resumable upload (the current multipart helper stops at 25 MB, and a ten-minute WAV take is about 50 MB); the `drive.file` write scope and the save-to-Drive destination flow from `sheet-music-save-to-drive` are reused.
- Playback: an offline render path (decode, shape, mix) for the mixdown, shared in spirit with the `composite-tracks` export.
- Dependencies: none expected; the WAV encoder is small enough to write in the repo.
- Docs: README and CLAUDE.md workspace layout (new package), `docs/mobile-cross-platform-audio-playback.md` (overlay path).
- Related: `composite-tracks` (shared mixer), `native-playback-follow-ups` (native recording).
