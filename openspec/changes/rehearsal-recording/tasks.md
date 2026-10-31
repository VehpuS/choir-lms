## 1. Spikes (decide before building)

Web is the build and verification target. Native handling is deferred to `native-playback-follow-ups` (task 8.1 hands it over); nothing here builds toward it beyond the capability gate in 3.1. If a spike fails, cut scope back (manual nudge only, or record-only) before starting 3.x.

- [ ] 1.1 Clock mapping: in the browser, record a click track while it plays through the media element and measure the error of the `performance.now()` anchor fit (design Decision 2) against the known click positions. Decide the tolerance, or decide to route the media element into one `AudioContext`.
- [ ] 1.2 Latency sources: read `outputLatency`, `baseLatency`, and `getOutputTimestamp` on Chrome, Safari, and Firefox with speakers, wired headphones, and Bluetooth; compare to a loopback measurement. Decide whether the estimate is worth showing and whether loopback calibration is reliable (design Decision 3).
- [ ] 1.3 Overlay sync: schedule an `AudioBufferSourceNode` against the media element, run play, pause, seek, and loop wrap for a few minutes, and measure drift and clicks. Decide the tolerance and crossfade length (design Decision 5).
- [ ] 1.4 Review a mock of the recording strip, takes list, overlay balance and nudge controls, and calibration flow with the user, and record the approved placement and look in the design before any UI task (5.1 onward).

## 2. Models and pure logic

- [ ] 2.1 Add the `Take` type and helpers (default names, owner key, size and duration formatting, nudge clamp) to `audio-library-models`, with specs.
- [ ] 2.2 Scaffold `@org/audio-mixing` with the `nx-generate` skill, copying an existing small package's setup; depend on `audio-library-models`; commit the manifest and `package-lock.json` together and run `npm ci`. Add it to the CLAUDE.md workspace layout and the README.
- [ ] 2.3 In that package add the alignment math (track position, take start, compensation, nudge), the clock-anchor fit, the balance-to-gain mapping, and the sync controller against `Transport` and `Voice` interfaces with injected clock and timers. Spec play, pause, seek, loop wrap, drift, and out-of-range positions with fakes.
- [ ] 2.4 Add the 16-bit mono WAV encoder and decoder header logic (pure, in the app or the models package, wherever it is shared) and the latency calibration analysis (find click offsets by cross-correlation in a recorded buffer). Spec with synthetic signals, including noise, a missing click, and a double click.

## 3. Capture

- [ ] 3.1 Add `recordingCapabilities()` (like `pitchCapabilities()`): web with microphone and IndexedDB can record, native cannot. Spec the gate.
- [ ] 3.2 Extend `PcmSource` with the optional `onBlock` stream and run the frame assembler only when a subscriber wants frames (design Decision 1). Update the shared-source spec; confirm the pitch store specs and the no-persistence guard still pass.
- [ ] 3.3 Build the `TakeRecorder`: subscribes for blocks, converts to Int16, tracks elapsed time, enforces the ten-minute cap, stops on every reason in the spec and keeps what was captured, discards takes under one second. Spec with a fake `PcmSource`.
- [ ] 3.4 Add a guard test that only the recording code writes audio samples, alongside the existing pitch guard.

## 4. Storage

- [ ] 4.1 Build the take store (IndexedDB, `.web`, with a native file that is unavailable): `takes` and `take-audio` stores, list by owner, read, rename, delete, one-transaction write, total size, persistent-storage request. Spec with a fake IndexedDB, including write failure.
- [ ] 4.2 Show the takes total beside the offline storage view with a clear label that it is separate from the cache budget. Spec the model.
- [ ] 4.3 Check that cache eviction and `Forget` flows never touch takes; add a spec.

## 5. Recording UI

- [ ] 5.1 Add the `Recording` row to the `Practice tools` model, hook, and menu; update their specs.
- [ ] 5.2 Build the recording strip: first-run explanation with `Continue`, blocked and unavailable states, the unavailable reasons (no track, shaped playback), the recording state with elapsed time and stop, and the stop-reason message. Spec the model; verify in the browser preview.
- [ ] 5.3 Capture the start position: run the clock-anchor fit while recording and store `trackStartMs` and the applied compensation on the take. Spec with fake clocks.
- [ ] 5.4 Build the takes list (name, date, length, size), rename, delete with confirmation, and play-alone. Spec the model; verify in the browser preview.

## 6. Overlay playback

- [ ] 6.1 Implement the web `Transport` and `Voice` for the controller (media element and `AudioBufferSourceNode`), including decode of the selected take only and the missing-audio failure.
- [ ] 6.2 Add the take selector, balance control, and the unavailable reason under shaped playback to the playback screen; spec the model and verify in the browser preview with a playing track.
- [ ] 6.3 Add the nudge control and save it with the take.
- [ ] 6.4 Build calibration: the click playback, the recording, the analysis from 2.4, the failure message, and storage per output device. Verify with speakers and with headphones held to the microphone.

## 7. Verification

- [ ] 7.1 Live check with a real microphone: capture settings honoured (`track.getSettings()`), capture running alongside the Shaka-backed player, recording while pitch detection is on, the strip over the playback sheet, and measured alignment error of a take against the track.
- [ ] 7.2 Run `nx run-many -t lint test typecheck build` for the touched projects, fix findings, and clear Problems in touched files.

## 8. Docs and hand-off

- [ ] 8.1 Hand native recording and overlay to `native-playback-follow-ups` (audio session, permissions, background behaviour).
- [ ] 8.2 Update the README, the CLAUDE.md workspace layout, and `docs/mobile-cross-platform-audio-playback.md` with the overlay path; note in `composite-tracks` where the mixer now lives; correct the "shared clock" note in the archived pitch-detection design Decision 12 only by a pointer, not a rewrite.
- [ ] 8.3 Archive the change and sync the specs.
