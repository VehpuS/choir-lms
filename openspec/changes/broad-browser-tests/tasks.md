## 1. Tooling

- [x] 1.1 Network guard in `openMockLibrarySession` and `runScenario` (fails on undeclared hosts), with a scenario that proves it
- [x] 1.0 Commit fixtures: `choir-stem.m4a`, the full MIDI file and the full MusicXML score under `src/test-support/fixtures/`, with a spec that checks they exist, parse, and keep the fixture directory under the size budget; `.gitattributes` entry for the MusicXML
- [x] 1.2 `buildToneWav` and Drive/web-link media serving with `Range` support, serving the stem as `audio/mp4` and an AAC codec probe
- [x] 1.3a Audio output tap, forced sample rate, CPU throttle and device profiles (quick and full), plus the PCM quality analyzer (pitch drift, clicks, dropouts, clipping, loudness) with unit specs on synthetic signals
- [x] 1.3 Fake microphone fed by the stem (launch flags, WAV transcode helper) and a recording-capable session option
- [x] 1.4 Page helpers (`openTab`, `openTrackMenu`, `expectToast`, `expectNoConsoleErrors`) and trace + console capture on failure
- [x] 1.5 Fixture builders for loops, playlist items, tags, markers, lyrics, composites and recordings, each with a round-trip spec
- [x] 1.6 Migrate the older scenarios onto `runScenario` (the `--scenario=` filter is done in 1.7)
- [x] 1.7 CI time: the audio tap runs on an `AudioWorklet` (a main-thread script processor dropped audio under CI load and read as clicks); `run-scenarios.ts` runs scenarios in parallel, to the end, with timings and `--scenario=` / `--lane=`; slow scenarios go in the opt-in `*.matrix.scenario.ts` lane (`browser-test-matrix` target and a manual / `browser-matrix`-label workflow); the `browser` job runs alongside `main` instead of after it, with a timeout

## 2. Scenarios (one subtask per area; each offline)

- [x] 2.1 Shell navigation and view restore
- [x] 2.2 Library tracks and files (search, folders, bulk selection)
- [x] 2.3 Playlists
- [x] 2.4 Loops
- [x] 2.5 Playback, speed/pitch and queue, with the slowdown quality checks, readout/engine agreement and a ten-minute track
- [x] 2.6 Markers and lyrics
- [x] 2.7 Tags and search
- [x] 2.8 Drive flows (import review, reconnect, offline files)
- [x] 2.9 Backup, restore and share (bundles generated with the runtime builder), in four slices:
  - [x] 2.9a A writable in-memory mock Drive: a Drive query evaluator (name, name contains, mimeType, `'<id>' in parents`, `'me' in owners`, `sharedWithMe`, `trashed`, `appProperties has {…}`, and/or/parentheses) with a spec; create, multipart and resumable upload, patch, delete, `about`; an authorized session that can hold the write scope
  - [x] 2.9b Backup scenario: allow saving, back up, the bundle and its audio land in Drive
  - [x] 2.9c Restore and import scenario: preview a bundle, additive import result, restore replaces
  - [x] 2.9d Share and access guide scenario: share-folder and the access guide against mock Drive responses
- [x] 2.10 Recordings, including the stem's pitches: E4, C♯4, C4 in order through the app's segmenter
- [x] 2.11 Composite tracks (list, play, Mix panel mute/solo, built-in and saved presets, export sheet, re-link a missing stem)
- [x] 2.12 Settings (categories, Bulk selections and Renaming preferences change, save, survive a reload, reset)
- [x] 2.13 Sheet music beyond PDF (full MusicXML as `.musicxml` and `.mxl`, and MIDI-derived notation); about 12 s, so it stays in the default lane for now
- [x] 2.14 Sung pitches marked on the rendered score: with the stem as the microphone and Pitch detection on, the open MusicXML and MIDI scores mark the noteheads of E4, C♯4, C4 in turn (the `data-score-pitch-marks` style targets `data-midi` 64, 61, 60, and those noteheads exist in the drawn score); the other-octave setting adds the soft marks; about 16 s alone, so like 2.13 it stays in the default lane for now

- [x] 2.15 Piano and the full-screen pitch tool, added on request after the planned scenarios: `piano.scenario.ts` (a new session that is not signed in: the key lights and plays a C4, heard in the audio tap), `piano-after-sign-in.scenario.ts` (the mock Drive can now complete a Google sign-in through the app's popup flow, `completeSignIn: true`; a key pressed right after it plays, with the piano opened before or after), `piano-during-playback.scenario.ts` (a key plays under a playing track, which keeps moving), `piano-pitch-highlight.scenario.ts` (the sung E4, C♯4, C4 light their keys in view, and an arrow names them when the keyboard is scrolled out of view to either side) and `pitch-full-view.scenario.ts` (Open full view, the readout, holding a target, zoom, the minimum volume, Stop, Back to monitor); shared steps in `piano-helpers.ts`

## 3. Agent guidance and CI

- [x] 3.1 `browser-test-coverage` skill with `.claude/skills/` symlink
- [x] 3.2 `AGENTS.md`, `CLAUDE.md`, testing policy and `mobile-web-runtime-debugging` updates; refresh `tools/browser-session/README.md`
- [x] 3.3a The matrix lane: `slowdown-quality.ts` is shared by `playback-slowdown-quality.matrix` (quick profiles plus the 4x CPU phone) and the new `playback-device-matrix.matrix` (iPhone 14, iPad, a 6x CPU phone, a 22.05 kHz desktop); `--browser=chromium|webkit|firefox` on `run-scenarios.ts` and `browser` / `lane` inputs on the `Browser matrix` workflow; `requires` (and the implied Chromium need of the fake microphone and CPU throttling) skips a scenario instead of failing it. WebKit could not be installed in the sandbox this was written in, so a WebKit run is still to be tried from the workflow
- [x] 3.3 CI uploads traces (the `browser` and `browser-matrix` jobs upload `browser-session-output/`, which holds `failure-trace.zip` and `failure-console.txt` on a failure); total `browser` job time confirmed on CI at the end of section 3: `browser` 4m09s with 34 default-lane scenarios, alongside `main` at 4m53s, and the opt-in `matrix` job 6m15s (limit 30 min), all green on the same head. The `browser` job is now shorter than `main`, so a PR does not wait on it and sharding is not needed; revisit if the default lane grows past `main` or the matrix job nears its limit

## Follow-ups

Unrelated bugs, findings, ideas, improvements and questions met while implementing or browser testing are recorded here as `F.n` subtasks, done after the planned tasks and before archiving.

- [x] F.1 `tools/browser-session/` is outside every lint and typecheck target (seen in 1.1), so scenario and helper TypeScript is never checked by `nx lint`; added `tools/browser-session/tsconfig.json` and the `typecheck-browser-tests` target (a dependency of `lint`); it found one unused import, now removed
- [x] F.2 Playing a Drive track on web logs `Failed to load resource: net::ERR_FILE_NOT_FOUND` for a `blob:` URL (seen in 1.2): traced with logged `createObjectURL`/`revokeObjectURL` calls; the failing URL is a MediaSource URL that Shaka creates and revokes itself (stack in the Shaka bundle) before the app sets the media element's `src` to its own audio blob, which is not revoked until reset or stop. The app's blob lifetime is correct, so this is harmless baseline noise, now documented in `mock-library-session.ts`
- [x] F.3 Cache the Expo browser-test export across CI runs (about 115 s of the `browser` job; seen in 1.7): `build-browser-test` inputs now leave out spec files, `src/test-support` and its own output, so test-only changes (verified locally: a test-support edit and a tooling edit both hit the Nx cache) reuse the export, and the `browser` job and the matrix workflow keep `.nx/cache` between runs with `actions/cache` (keyed on the lockfile and commit, restoring the newest earlier entry). The saving still has to be confirmed on CI, from the build step time on a second run
- [x] F.4 The bulk Add to playlist picker (Library Files selection) had no "New playlist" option while the single-track picker does (seen in 2.2); decided: add it. `New playlist…` now tops the bulk picker and opens the name sheet (same result as Save as playlist, the selection and the settled bulk choices carried over); covered by a step in `library-files-bulk.scenario.ts`
- [x] F.5 Tapping a playing playlist's title in Recents did nothing, and View in library landed on Library > Playlists rather than the playlist (seen in 2.3); decided: open the playlist itself. A playing playlist is no longer listed (F.6), and `View in library` on a playlist row now opens its detail (`requestedPlaylistId` request channel from the router through the Library screen to the section, like tags and loop edits); the `playlists` scenario checks it
- [x] F.6 Recents must not list the item that is current in the player (seen in 2.3): `excludeCurrentRecents` (unit specs in `row-model.spec.ts`) hides the current item or playlist, paused included, so there is no flicker on pause; it is listed once it is no longer current, for example after a reload. The `playlists` scenario now checks not listed while playing, listed after a reload, and View in library from there
- [x] F.7 Recents lists a played playlist as the playlist only, never its individual tracks (including after a reload): already how the history records it; now covered by the `playlists` scenario, which plays a playlist, reloads, and checks Recents shows the playlist once and neither of its tracks
- [x] F.8 Investigated the two audio glitches measured in 2.5 (`playback-slowdown-quality.matrix`), each against a control with no app code. (a) Clicks on the pitch-shifted (Web Audio shaper) path at +2 semitones: the app path measured 0 clicks in 120 s on the desktop profile and 1 in 60 s on the phone profile, and a clean 330 Hz oscillator fed straight into the same SoundTouch worklet gave 1 click in 38 s (0 at 0 st), so the rate is about one a minute, not one per 10 to 12 s (that was a small-window estimate), and it is the worklet's, not the app's graph. (b) The clicks right after a speed change: a bare `<audio>` element with no app code clicked once on each change to or from 1x (6 clicks over 12 changes) and none at 0.5x or 0.25x, so these are the browser's time-stretcher; the rare ~22 ms gap did not reproduce in 12 changes. Nothing in the app to fix, so `MAX_CLICKS` and `MAX_DROPOUT_MS` stay (the comment in `slowdown-quality.ts` now says why). Possible later experiment: the worklet's `interpolationStrategy` option, which the app leaves at the library default
- [x] F.9 Practice tools: Piano and the bottom-bar tab were not covered, and with a track playing there were two "Practice tools" buttons (the tab and the playback sheet's toolbox; seen in 2.1 and 2.5); decided: rename the sheet's button. It is now "Playback practice tools" (`PLAYBACK_PRACTICE_TOOLS_LABEL`), the tab keeps "Practice tools", and the pitch, recording and score pitch scenarios use the new name. The new `practice-tools.scenario.ts` covers the tab's menu, the piano keyboard and its controls, Close piano, and the playback screen's button opening the same piano
