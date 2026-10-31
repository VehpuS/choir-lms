## 1. Spikes (decide before building)

Web is the build and verification target. Native handling is deferred to `native-playback-follow-ups` (task 10.1 hands it over); nothing here builds toward it beyond the capability gate in 3.1. If a spike fails, cut scope back (for example record-only, or nudge-only alignment) before starting 3.x.

- [ ] 1.1 Clock mapping: in the browser, record a click track while it plays through the media element and measure the error of the `performance.now()` anchor fit (design Decision 2) against the known click positions, including a pause, a seek, a loop wrap, and a track at 0.7× and 1.3×. Decide the tolerance, or decide to route the media element into one `AudioContext`.
- [ ] 1.2 Latency sources: read `outputLatency`, `baseLatency`, and `getOutputTimestamp` on Chrome, Safari, and Firefox with speakers, wired headphones, and Bluetooth; compare to a loopback measurement. Decide whether the estimate is worth showing and whether the click calibration is reliable enough to offer (design Decision 3).
- [ ] 1.3 Overlay sync: schedule an `AudioBufferSourceNode` against the media element, run play, pause, seek, and loop wrap for a few minutes with the track at 1×, 0.7× and 1.3×, and measure drift and clicks. Decide the tolerance and crossfade length (design Decision 5).
- [ ] 1.4 Mixdown render: in the browser, render a ten-minute take over a track at 0.7× with a pitch shift through an `OfflineAudioContext` and the SoundTouch processor; measure time and memory, and compare the result with a live capture of the same playback. Decide the chunk size, and whether a long mixdown needs a worker.
- [ ] 1.5 Review `design-source/recording-mock.html` (open it in a browser) with the user: the recording strip (with marker context), save sheet, takes list (with spans and loop takes), overlay balance and sync controls, the opt-in calibration flow, the export dialog, the offline files rows, and the punch-range sheet. Record the approved placement and look in the design before any UI task (5.1 onward).

## 2. Models and pure logic

- [ ] 2.1 Add the `Take` type and helpers to `audio-library-models`: default names, owner key, the timeline (segments with take span, track start, rate, pitch) and its lookups in both directions (track position to take times, take time to track position), loop reference, size and duration formatting, nudge clamp. Spec with timelines that include pauses, seeks, loop passes, and rates other than 1.
- [ ] 2.2 Scaffold `@org/audio-mixing` with the `nx-generate` skill, copying an existing small package's setup; depend on `audio-library-models`; commit the manifest and `package-lock.json` together and run `npm ci`. Add it to the CLAUDE.md workspace layout and the README.
- [ ] 2.3 In that package add the clock-anchor fit (one fit per uninterrupted stretch), the timeline builder used by the recorder, the balance-to-gain mapping, and the sync controller against `Transport` and `Voice` interfaces with injected clock and timers: play, pause, seek, loop wrap, loop-pass selection, and out-of-range positions. Spec each with fakes.
- [ ] 2.4 Add the 16-bit mono WAV encoder and decoder header logic (pure, in the app or the models package, wherever it is shared) and the click-calibration analysis (find click offsets by cross-correlation in a recorded buffer). Spec with synthetic signals, including noise, a missing click, and a double click.

## 3. Capture

- [ ] 3.1 Add `recordingCapabilities()` (like `pitchCapabilities()`): web with microphone and IndexedDB can record, native cannot. Spec the gate.
- [ ] 3.2 Extend `PcmSource` with the optional `onBlock` stream and run the frame assembler only when a subscriber wants frames (design Decision 1). Update the shared-source spec; confirm the pitch store specs and the no-persistence guard still pass.
- [ ] 3.3 Build the `TakeRecorder`: subscribes for blocks, converts to Int16, tracks elapsed time, enforces the ten-minute cap, stops on every reason in the spec and keeps what was captured, discards takes under one second. Spec with a fake `PcmSource`.
- [ ] 3.4 Add a guard test that only the recording code writes audio samples, alongside the existing pitch guard.
- [ ] 3.5 Add the entry snapshot to the `Take` model and the recorder: source file id, name, content version, duration, adjusted-copy origin, loop and markers within the span; list and describe takes from the snapshot, and show `Original track changed` when the version no longer matches. Spec with a renamed track, moved markers, a deleted loop, and a replaced file.

## 4. Storage

- [ ] 4.1 Build the take store (IndexedDB, `.web`, with a native file that is unavailable): `takes` and `take-audio` stores, list by owner track and by loop, read, rename, delete, one-transaction write, total size, persistent-storage request. Spec with a fake IndexedDB, including write failure.
- [ ] 4.2 Show the takes total beside the offline storage view with a clear label that it is separate from the cache budget. Spec the model.
- [ ] 4.3 Keep the original audio with the take: store it in the audio store as a pinned entry keyed by file id and content version with the takes as owners, adopt existing offline bytes, share between takes, remove with the last owner, list it in the offline files view as kept for takes, and offer `Keep the original with this take` (on by default) when saving. Check how the audio store keys and the offline view treat the new entry before building. Spec adoption, sharing, removal, and the toggle.
- [ ] 4.4 Check that cache eviction and `Forget` flows never touch takes; add a spec.

## 5. Recording

- [ ] 5.1 Add the `Recording` row to the `Practice tools` model, hook, and menu; update their specs.
- [ ] 5.2 Build the recording strip: first-run explanation with `Continue`, blocked and unavailable states (no track loaded), the recording state with elapsed time and stop, the speed and pitch controls locked with a note, the previous and next marker beside the time, and the stop-reason message. Spec the model; verify in the browser preview.
- [ ] 5.3 Record the timeline: read the shaping (speed and pitch) once at the start and store it on the take, disable the speed and pitch controls with a note while the take records, subscribe to the transport, fit one stretch per uninterrupted playback, and write the segments and the applied compensation to the take. Detect an active loop at start and store the loop reference. Spec with fake clocks, including a take at 0.7× and a take across a loop wrap.
- [ ] 5.4 Manual segments: starting from any position and stopping by hand, with the track continuing; spec and verify in the browser preview that a take from the middle of a track has the right timeline.
- [ ] 5.5 Build the takes list: name, date, length, size, span as marker names near markers and as times otherwise, loop takes also listed under the loop, rename, delete with confirmation, and play-alone. Spec the span model; verify in the browser preview. A take whose track changed shows `Original track changed` and plays its overlay against the kept copy.

## 6. Overlay playback

- [ ] 6.1 Implement the web `Transport` and `Voice` for the controller (media element and `AudioBufferSourceNode`), including decode of the selected take only and the missing-audio failure.
- [ ] 6.2 Add the take selector and balance control to the playback screen; spec the model and verify in the browser preview with a playing track.
- [ ] 6.3 Shaping behaviour: selecting a take applies its stored speed and pitch to the session and locks the controls with a note; deselecting restores the previous shaping; the take itself stays unshaped. Spec the select and deselect model. Verify in the browser preview with a take recorded against a track at 0.7× with a pitch shift, including that it stays aligned.
- [ ] 6.4 Loop takes: play pass n over pass n and go silent after the last pass. Verify in the browser preview with a three-pass take.
- [ ] 6.5 Build the sync control: 1 ms and 10 ms steps, slider to ±250 ms, reset, audible immediately, saved with the take, and `Use for this device` storing the default per output device label. Spec the model and the device default store.
- [ ] 6.6 Build the opt-in click calibration: reachable from the sync panel, never prompted, the click playback, the recording, the analysis from 2.4, the failure message that points to the manual control, and storage as the device default. Verify with speakers and with headphones held to the microphone.

## 7. Verification

- [ ] 7.1 Live check with a real microphone: capture settings honoured (`track.getSettings()`), capture running alongside the Shaka-backed player, recording while pitch detection is on, the strip over the playback sheet, and measured alignment error of a take against the track at 1× and at a shaped speed.
- [ ] 7.2 Run `nx run-many -t lint test typecheck build` for the touched projects, fix findings, and clear Problems in touched files.

## 8. Punch ranges (last slice; can be cut without leaving a gap)

- [ ] 8.1 Add the armed state to the recording model: choose an in point and an out point from markers or the active loop's ends, show `Record from <marker> to <marker>`, and start and stop the take when playback reaches them; manual stop always works. Spec with a fake transport.
- [ ] 8.2 Build the arming UI in the strip and on markers and loops, and verify in the browser preview that a take armed from one marker to the next starts and ends on them.

## 9. Export to Drive

- [ ] 9.1 Add a resumable upload to `packages/google-drive` (chunked, progress, cancel, resume from the last chunk, the existing failure reasons), keeping the multipart helper for small files. Spec with a fake endpoint, including an interrupted upload.
- [ ] 9.2 Build the offline mixdown renderer from the snapshot and timeline (track stretches at the take's stored rate and pitch, silence while paused, the take placed with compensation and nudge, chosen balance), chunked and encoded to Int16 as it goes, with progress and cancel. Spec the timeline-to-render plan purely; check the render against the spike in 1.5.
- [ ] 9.3 Build the export dialog: `Export recording` and `Export mix`, `Download` or `Save to Drive` for each export, destination folder and name (reusing the save-to-Drive destination step), balance for the mix, source-unavailable message (only when no copy was kept) with the bare recording still offered, permission request at confirmation, progress, cancel, success and failure states. Spec the model; verify in the browser preview against the user's Drive (a short bare recording and a short mix, opened afterwards).

## 10. Docs and hand-off

- [ ] 10.1 Hand native recording and overlay to `native-playback-follow-ups` (audio session, permissions, background behaviour).
- [ ] 10.2 Update the README, the CLAUDE.md workspace layout, and `docs/mobile-cross-platform-audio-playback.md` with the overlay path; note in `composite-tracks` where the mixer now lives; correct the "shared clock" note in the archived pitch-detection design Decision 12 only by a pointer, not a rewrite.
- [ ] 10.3 Archive the change and sync the specs.
