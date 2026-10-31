## Why

Singers practise a part against a track, but today they cannot hear themselves against it afterwards. `pitch-detection` tells them live whether a note is in tune; it keeps nothing. A recording, lined up with the track and playable together with it, lets a singer check timing, blend, and entrances, and compare a second attempt with a first. The microphone path built for pitch detection (`PcmSource`) was shaped for a recorder to reuse, and the `Practice tools` menu was shaped to take a third row, so this is the natural next step.

## What Changes

- Add a `Recording` tool to the `Practice tools` menu (web only for now). While a track plays, the user starts a recording, sings, and stops by hand at any point, so a recording can cover any segment of the song, an active loop, or a punch range set up in advance. The recording is stored with a timeline that maps its audio to track positions, and the strip and the lists show the markers around it.
- Recordings are not library files. They are children of the track or loop they were made on, like markers and lyrics, and are viewable from the playback screen's `More actions` menu (a `Recordings` action beside the marker and loop actions, with no top-level button) whether or not the Recording tool is on. A recording made on a loop belongs to that loop: it appears in the parent track's Loops section and in the loop's own view, never in the track's main list, and a loop view shows only recordings made on it. Recordings made on an adjusted track or one of its loops also appear under the parent track.
- Opening a recording opens its track in the context it was made in: the loop, adjusted track, or recorded segment, with the recorded speed and pitch applied (including adjustments that were never saved), all locked.
- Speed and pitch shaping affect only the background track. They stay fixed for the duration of a recording and again whenever it is played with its track. To hear a recording at another speed, export a mix and use the ordinary track controls.
- Capture recordings from the shared microphone (`PcmSource`) as unprocessed mono audio, encode them as 16-bit mono WAV, and keep them in dedicated local storage that is never purged automatically: the raw recording is always kept until the user deletes it. Users can export a recording to a download or to Drive at any time, and can turn on automatic export of copies to Drive.
- Overlay playback: a recording plays together with its track, aligned to track time, staying in sync through play, pause, seek, and loop wrap, with a balance control. The original track audio is never copied for a recording; it comes from the normal playback cache, the offline store, or Drive, found from the recording's metadata. A recording's overlay works offline when its track is stored, and the recording's menu can keep the track offline; recordings add no cache of their own.
- Latency compensation: a default estimate from the browser, a per-recording nudge that is quick to use and can be saved as the device default (the convenient manual path), and an opt-in click calibration that measures the real round trip.
- Make each recording self-contained metadata, enough to rebuild its overlay and its mix from the metadata, the bare recording, and the original track alone: the original track (Drive file id, name, content version, duration), its adjusted-copy origin and adjustment values, the loop and markers in play, and the shaping and punch range in effect, so overlay and mix can be rebuilt later and the entry stays meaningful when the track, its markers, or its loops change.
- Add a Recordings view to the Library: browse, search, filter, and sort every recording across tracks, with bulk actions (keep track offline, export, playlists, queue, delete).
- Recordings can be queued and added to playlists; a playlist recording plays in its recorded context, then the queue moves on.
- Add export, either as a download to the device or as new Drive files after the user confirms a destination folder: the recording alone (WAV), and a mix of the recording over the original track as it was heard while recording, including its speed, pitch, loop passes, and punch range. Both use the existing narrow write permission and a resumable upload for files beyond the current 25 MB limit.
- Add automatic export of copies to Drive, off by default and set in Settings: a dedicated Drive folder the user can choose, whether to export the recording alone, the mix, or both, and whether to upload only over Wi-Fi (the default, where the browser can tell). Each recording shows its export status, failures can be retried, and deleting a recording never deletes its Drive copies.
- Punch ranges are the last slice: set an in and out point by dragging handles on the waveform, snapping to markers or loop ends, or typing times, with an optional pre-roll; arming then starts and stops the recording by itself. Manual start and stop always stay available.
- Give `PcmSource` a contiguous block stream beside its overlapping analysis frames, and correct its capture timestamps so they can be related to track position (the pitch-detection design assumed a clock shared with playback; there is none today).
- Add a framework-agnostic mixing package for transport sync, drift correction, alignment, and gain, written so `composite-tracks` can reuse it for stems.
- Recording is an explicit feature with its own explanation and storage rules. Pitch detection still stores nothing and its guard test is unchanged.

Not in this change: compressed export formats (MP3, AAC), stretching a recording to a different track speed, native iOS and Android (handed to `native-playback-follow-ups`).

## Capabilities

### New Capabilities

- `rehearsal-recording`: offering the tool, consent and indicator, recording against a playing track at any shaping, manual segments and loop recordings, marker context, safe stopping, the metadata a recording stores, and punch ranges with their setup.
- `recording-playback`: opening a recording in its recorded context, playing it with its track in sync, the balance control, loop passes, latency compensation by estimate, nudge, and opt-in calibration.
- `recording-library`: where recordings appear (playback screen, loop views, adjusted tracks and parents), the Library Recordings view with search, filters, and bulk actions, and recordings as playlist and queue items.
- `recording-storage`: the dedicated, never-purged local store for recordings, storage use and failure states, keeping the track offline from a recording, the settings, the offline files view rows, and how the original track audio is found.
- `recording-export`: exporting a recording alone and a mix to the device or to new Drive files, automatic export to Drive with its settings and status, permission, progress, and failure states.

### Modified Capabilities

None. `pitch-detection`, `offline-audio-caching`, and `practice-loops-and-playlists` requirements are unchanged; the new capabilities add alongside them.

## Impact

- `packages/mobile-rehearsal-player`: `library/pitch/pcm-source*.ts` (block stream, timestamps), new `library/recording/` (recorder, store, WAV encoder, panel, library view, punch setup), `library/practice-tools/` (third row), playback integration for the overlay and the recorded context, Library tabs, playlist item types, offline settings and files view.
- New package `packages/audio-mixing` (framework-agnostic sync and gain logic; depends on `audio-library-models`), and recording types in `audio-library-models`.
- Storage: a new IndexedDB database for recordings on web that is never purged automatically, and no new cache; the track audio store is not changed.
- Google Drive: `packages/google-drive` gains a resumable upload (the current multipart helper stops at 25 MB, and a ten-minute WAV recording is about 50 MB); the `drive.file` write scope and the save-to-Drive destination flow from `sheet-music-save-to-drive` are reused.
- Playback: an offline render path (decode, shape, mix) for the mix export, shared in spirit with the `composite-tracks` export.
- Dependencies: none expected; the WAV encoder is small enough to write in the repo.
- Docs: README and CLAUDE.md workspace layout (new package), `docs/mobile-cross-platform-audio-playback.md` (overlay path).
- Related: `composite-tracks` (shared mixer), `native-playback-follow-ups` (native recording).
