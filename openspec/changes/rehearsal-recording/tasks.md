## 1. Spikes (decide before building)

Web is the build and verification target. Native handling is deferred to `native-playback-follow-ups` (task 13.1 hands it over); nothing here builds toward it beyond the capability gate in 3.1. If a spike fails, cut scope back (for example record-only, or nudge-only alignment) before starting 3.x.

- [ ] 1.1 Clock mapping: in the browser, record a click track while it plays through the media element and measure the error of the `performance.now()` anchor fit (design Decision 2) against the known click positions, including a pause, a seek, a loop wrap, and a track at 0.7× and 1.3×. Decide the tolerance, or decide to route the media element into one `AudioContext`.
- [ ] 1.2 Latency sources: read `outputLatency`, `baseLatency`, and `getOutputTimestamp` on Chrome, Safari, and Firefox with speakers, wired headphones, and Bluetooth; compare to a loopback measurement. Decide whether the estimate is worth showing and whether the click calibration is reliable enough to offer (design Decision 3).
- [ ] 1.3 Overlay sync: schedule an `AudioBufferSourceNode` against the media element, run play, pause, seek, and loop wrap for a few minutes with the track at 1×, 0.7× and 1.3×, and measure drift and clicks. Decide the tolerance and crossfade length (design Decision 5).
- [ ] 1.4 Mix render: in the browser, render a ten-minute recording over a track at 0.7× with a pitch shift through an `OfflineAudioContext` and the SoundTouch processor; measure time and memory, and compare the result with a live capture of the same playback. Decide the chunk size, and whether a long mix needs a worker.
- [ ] 1.5 Review `design-source/recording-mock.html` (open it in a browser) with the user: the Recordings action in More actions, the panel and its loop and adjusted-track views, the recording strip with marker context, the save sheet, opening a recording in its locked context, overlay balance and sync controls, the opt-in calibration, the punch range setup, the Library Recordings view with filters and bulk actions, playlists and queue, the overlay-offline actions, the Recordings settings and auto-export, the offline files rows, and the export dialog. Record the approved placement and look in the design before any UI task (5.1 onward).

## 2. Models and pure logic

- [ ] 2.1 Add the `Recording` type and helpers to `audio-library-models`: default names, owner and lineage, the timeline (segments with recording span, track start, held) and its lookups in both directions (track position to recording times, recording time to track position), shaping, loop reference, punch range, size and duration formatting, nudge clamp. Spec with timelines that include pauses, seeks, loop passes, and rates other than 1.
- [ ] 2.2 Add the pure visibility model: given a library (tracks, adjusted copies, loops) and recordings, return where each recording is listed (track main section, a track's `Loops` section, a loop view, an adjusted track, its parent) per design Decision 10, and the context to open for a recording (design Decision 11: loop, adjusted track or parent with the stored adjustment, recorded range, locked shaping). Spec a loop on a track, a loop on an adjusted track, a deleted adjusted copy, a deleted loop, a session adjustment, and a segment recording.
- [ ] 2.3 Scaffold `@org/audio-mixing` with the `nx-generate` skill, copying an existing small package's setup; depend on `audio-library-models`; commit the manifest and `package-lock.json` together and run `npm ci`. Add it to the CLAUDE.md workspace layout and the README.
- [ ] 2.4 In that package add the clock-anchor fit (one fit per uninterrupted stretch), the timeline builder used by the recorder, the balance-to-gain mapping, and the sync controller against `Transport` and `Voice` interfaces with injected clock and timers: play, pause, seek, loop wrap, loop-pass selection, and out-of-range positions. Spec each with fakes.
- [ ] 2.5 Add the 16-bit mono WAV encoder and decoder header logic (pure, in the app or the models package, wherever it is shared) and the click-calibration analysis (find click offsets by cross-correlation in a recorded buffer). Spec with synthetic signals, including noise, a missing click, and a double click.

## 3. Capture

- [ ] 3.1 Add `recordingCapabilities()` (like `pitchCapabilities()`): web with microphone and IndexedDB can record, native cannot. Spec the gate.
- [ ] 3.2 Extend `PcmSource` with the optional `onBlock` stream and run the frame assembler only when a subscriber wants frames (design Decision 1). Update the shared-source spec; confirm the pitch store specs and the no-persistence guard still pass.
- [ ] 3.3 Build the `Recorder`: subscribes for blocks, converts to Int16, tracks elapsed time, enforces the ten-minute cap, stops on every reason in the spec and keeps what was captured, discards recordings under one second. Spec with a fake `PcmSource`.
- [ ] 3.4 Add a guard test that only the recording code writes audio samples, alongside the existing pitch guard.
- [ ] 3.5 Capture the metadata (design Decision 9): source file id, name, content version and duration; lineage with the adjusted copy's adjustment values and the loop and range; shaping read once at the start; the markers within the span; the punch range. Spec with a renamed track, moved markers, a deleted loop, and a replaced file; confirm no copy of the track audio is written.

## 4. Storage

- [ ] 4.1 Build the recordings store (IndexedDB, `.web`, with a native file that is unavailable): `recordings` and `recording-audio` stores, list by owner and across the library, read, rename, delete (with its overlay segment and playlist references), one-transaction write, total size, and a persistent-storage request. Nothing removes a recording except delete. Spec with a fake IndexedDB, including write failure and that cache clearing, track eviction, sign-out, and forgetting a Drive session leave recordings alone.
- [ ] 4.2 Handle a failed write: keep what was captured, say why, and offer `Export` before it is lost. Spec.
- [ ] 4.3 Build the overlay segment cache: a separate store keyed by file id, content version, and range, with an overlay cache size (default 100 MB) and least-recently-played removal, rebuild on demand, whole-track recordings using the track path, and keeping a recording's overlay offline (pin) or removing it from offline, one at a time and in bulk. Check how the audio store and the offline files view treat entries before wiring. Spec the cache, the pin, and the offline-with-and-without-segment cases.
- [ ] 4.4 Settings: add a `Recordings` group beside the offline settings with the overlay cache size, the recordings total with the line that recordings are never removed automatically, and the auto-export settings (10.5). Add the overlay segment group and the recordings group to the offline files view (recordings with delete only). Spec the models.
- [ ] 4.5 Resolve the original audio from the recording's metadata through the normal track path (playback cache, offline store, Drive), with the overlay segment first when present, the content-version check, `Original track changed`, and the unavailable cases; confirm no pinning or copying of the track. Check that keeping a track offline asks nothing about recordings. Spec with a cached, a segment-cached, an evicted, a changed, and a deleted original.

## 5. Recording

- [ ] 5.1 Add the `Recording` row to the `Practice tools` model, hook, and menu; update their specs. The row controls only the strip and the start and arm controls.
- [ ] 5.2 Build the recording strip: first-run explanation with `Continue`, blocked and unavailable states (no track loaded), the `Record` split button (`Record now`, `Record between…`), the recording state with elapsed time and stop, the previous and next marker beside the time, the speed and pitch controls locked with a note, and the stop-reason message. Spec the model; verify in the browser preview.
- [ ] 5.3 Record the timeline: read the shaping (speed and pitch) once at the start and store it on the recording, disable the speed and pitch controls with a note while it records, subscribe to the transport, fit one stretch per uninterrupted playback, and write the segments and the applied compensation. Detect an active loop at start and make the loop the owner. Spec with fake clocks, including a recording at 0.7× and one across a loop wrap.
- [ ] 5.4 Manual segments: starting from any position and stopping by hand, with the track continuing; spec and verify in the browser preview that a recording from the middle of a track has the right timeline.
- [ ] 5.5 Build the save sheet: name, size, span as marker names, the note that the recording is on this device and never removed automatically, the auto-export state (`Auto-export is off · Turn on…`, or what is being uploaded and where), and `Export…`. Spec the model; verify in the browser preview.

## 6. Viewing recordings

- [ ] 6.1 Build the Recordings panel and its `Recordings` action in the playback `More actions` menu (check `now-playing-menu-model` and `use-now-playing-menu-actions` first; no top-level button or badge, a muted count in the menu row), available when the Recording tool is off: main section, `Loops` section grouped by loop, adjusted-track labels, spans, Drive status, overlay state, and the row menu (`Play`, `Play next`, `Add to queue`, `Add to playlist`, `Keep overlay offline`, `Export`, `Rename`, `Delete`). Spec the model from 2.2; verify in the browser preview.
- [ ] 6.2 Show recordings in loop views (only recordings made on that loop) and in adjusted-track and parent views, per design Decision 10; check the existing loop and adjusted-track screens before wiring. Verify in the browser preview with a loop on an adjusted copy.
- [ ] 6.3 Open a recording in its locked context (design Decision 11): the loop, the adjusted track, the recorded range for a segment or punch recording, the stored speed and pitch for a session adjustment, `Recording: <name>` with `Leave recording` restoring the previous context. Spec the context model; verify each kind in the browser preview.

## 7. Overlay playback

- [ ] 7.1 Implement the web `Transport` and `Voice` for the controller (media element and `AudioBufferSourceNode`), including decode of the selected recording only and the missing-audio failure.
- [ ] 7.2 Add the balance control to the recording context; spec the model and verify in the browser preview with a playing track.
- [ ] 7.3 Loop recordings: play pass n over pass n and go silent after the last pass. Verify in the browser preview with a three-pass recording.
- [ ] 7.4 Build the sync control: 1 ms and 10 ms steps, slider to ±250 ms, reset, audible immediately, saved with the recording, and `Use for this device` storing the default per output device label. Spec the model and the device default store.
- [ ] 7.5 Build the opt-in click calibration: reachable from the sync panel, never prompted, the click playback, the recording, the analysis from 2.5, the failure message that points to the manual control, and storage as the device default. Verify with speakers and with headphones held to the microphone.

## 8. Recordings in the Library, playlists, and the queue

- [ ] 8.1 Build the pure Library model for recordings: search (name, track title, loop name, marker names), filters (whole track, segment, loop, adjusted, on Drive, not on Drive, original changed, needs a connection for overlay, track), sorts, and row presentation. Spec with a synthetic library.
- [ ] 8.2 Add the `Recordings` view to the Library (check the current Library navigation before choosing the control), with the search field, filter sheet, sort, rows, and the empty state. Verify in the browser preview.
- [ ] 8.3 Add the recording bulk actions to the shared multi-selection (`Play next`, `Add to queue`, `Add to playlist`, `Keep overlay offline` or `Remove from offline`, `Export`, `Delete`), reusing the existing bulk bar. Check the multi-selection and queue code first. Spec.
- [ ] 8.4 Add a recording playlist-item type: persistence, display in playlists with the recording indicator, playback in the recorded context to the end of the range, restoring shaping for the next item, the unavailable case, and removal when a recording is deleted. Spec the model and the controller; verify in the browser preview with a playlist of a track, a loop, and two recordings.
- [ ] 8.5 Queue actions for recordings (`Play next`, `Add to queue`) and the mini-player and lock-screen presentation of a recording item. Spec; verify in the browser preview.

## 9. Verification

- [ ] 9.1 Live check with a real microphone: capture settings honoured (`track.getSettings()`), capture running alongside the Shaka-backed player, recording while pitch detection is on, the strip over the playback sheet, and measured alignment error of a recording against the track at 1× and at a shaped speed.
- [ ] 9.2 Run `nx run-many -t lint test typecheck build` for the touched projects, fix findings, and clear Problems in touched files.

## 10. Export

- [ ] 10.1 Add a resumable upload to `packages/google-drive` (chunked, progress, cancel, resume from the last chunk, the existing failure reasons), keeping the multipart helper for small files. Spec with a fake endpoint, including an interrupted upload.
- [ ] 10.2 Build the offline mix renderer from the metadata and timeline (track stretches at the recording's stored rate and pitch, silence while paused, the recording placed with compensation and nudge, chosen balance), chunked and encoded to Int16 as it goes, with progress and cancel. Spec the timeline-to-render plan purely; check the render against the spike in 1.4.
- [ ] 10.3 Build the export dialog: `Export recording only` and `Export mix`, `Download` or `Save to Drive` for each, destination folder and name (reusing the save-to-Drive destination step), balance for the mix, the `Original changed` warning and the unavailable message with the recording alone still offered, permission request at confirmation, progress, cancel, success and failure states. Spec the model; verify in the browser preview against the user's Drive (a short recording alone and a short mix, opened afterwards).
- [ ] 10.4 Build the export record on each recording (kind, file id, folder, time, status) and the auto-export queue: waits for a Drive session and a connection, runs after save, never repeats a kind, retries with backoff, builds the mix in the background from the saved compensation and nudge, marks a failed mix with its reason and still uploads the recording alone, and never deletes Drive copies. Spec with a fake uploader and fake connectivity.
- [ ] 10.5 Build the auto-export settings and surfaces: the switch (permission requested when turned on), the folder (default `Choir Recordings`, created if missing, or picked with the destination step), recording only, mix, or both, `Back up existing recordings`, the save sheet state, row status (`On Drive`, `Upload pending`, `Upload failed` with `Retry`), and the status sheet. Verify in the browser preview against the user's Drive.

## 11. Punch ranges (late slice; can be cut without leaving a gap)

- [ ] 11.1 Build the punch model: in and out points, snapping to markers and loop ends, typed times with nudges, `Use active loop` and `Use current position`, pre-roll, validity, and the armed state machine (armed, countdown, recording, stopped at out, disarmed, stopped early). Spec with a fake transport.
- [ ] 11.2 Build the setup sheet from the approved mock: the waveform with `In` and `Out` handles, marker flags and chips, time fields with nudges, the pre-roll stepper, `Keep playing after Out`, the summary, and `Arm`; and the armed and countdown strip states. Verify in the browser preview that dragging snaps to markers and that an armed range starts and stops on them.
- [ ] 11.3 Record a punch range: play from the pre-roll, start at the in point, stop at the out point, store the range in the metadata, and make it a loop recording when it came from the active loop. Spec with fake clocks and verify in the browser preview.

## 12. Docs

- [ ] 12.1 Update the README, the CLAUDE.md workspace layout, and `docs/mobile-cross-platform-audio-playback.md` with the overlay path; note in `composite-tracks` where the mixer now lives; correct the "shared clock" note in the archived pitch-detection design Decision 12 only by a pointer, not a rewrite.

## 13. Hand-off

- [ ] 13.1 Hand native recording and overlay to `native-playback-follow-ups` (audio session, permissions, background behaviour).
- [ ] 13.2 Archive the change and sync the specs.
