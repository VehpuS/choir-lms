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
- [ ] 2.13 Sheet music beyond PDF (full MusicXML as `.musicxml` and `.mxl`, and MIDI-derived notation)

## 3. Agent guidance and CI

- [ ] 3.1 `browser-test-coverage` skill with `.claude/skills/` symlink
- [ ] 3.2 `AGENTS.md`, `CLAUDE.md`, testing policy and `mobile-web-runtime-debugging` updates; refresh `tools/browser-session/README.md`
- [ ] 3.3a The matrix lane (the target and workflow exist from 1.7): fill it with the device descriptor, CPU throttling and sample-rate scenarios; add `--browser=webkit` on demand with `requires` skipping, WebKit installed only by that workflow
- [ ] 3.3 CI uploads traces; confirm total `browser` job time and note whether sharding is needed

## Follow-ups

Unrelated bugs, findings, ideas, improvements and questions met while implementing or browser testing are recorded here as `F.n` subtasks, done after the planned tasks and before archiving.

- [ ] F.1 `tools/browser-session/` is outside every lint and typecheck target (seen in 1.1), so scenario and helper TypeScript is never checked by `nx lint`; add a typecheck/lint target (and `tsconfig`) covering it and fix what it finds
- [ ] F.2 Playing a Drive track on web logs `Failed to load resource: net::ERR_FILE_NOT_FOUND` for a `blob:` URL (seen in 1.2, a generated tone played from the Library tab); find out whether the player revokes a blob URL too early or this is harmless, then fix or document it as baseline noise
- [ ] F.3 Cache the Expo browser-test export across CI runs (about 115 s of the `browser` job); it only changes when app inputs change, so most test-only PRs would hit it (seen in 1.7)
- [ ] F.4 Review: the bulk Add to playlist picker (Library Files selection) has no "New playlist" option, while the single-track Add to playlist picker does (seen in 2.2); decide whether the bulk picker should offer it too
- [ ] F.5 Review: tapping the title of a playing playlist in Recents does nothing visible; only the row menu (View in library) opens it, and that lands on Library > Playlists, not the playlist detail (seen in 2.3); confirm this is intended
- [ ] F.6 Recents must not list the item that is playing right now (today a playing playlist shows as "Playing now", duplicating the mini-player; seen in 2.3). An item appears in Recents only once it is no longer playing, for example after the app is closed and reopened. Update the `playlists` scenario, which currently expects "Playing now" in Recents, to cover: not listed while playing, listed after a reload, and View in library from there (relates to F.5)
- [ ] F.7 Recents lists a played playlist as the playlist only, never its individual tracks or loops (including after the app is reopened, and when the tracks were played through the playlist); add a browser scenario that plays a playlist, reloads, and checks Recents shows one entry
- [ ] F.8 Investigate two audio glitches measured in 2.5 (`playback-slowdown-quality.matrix`): (a) about one click per 10 to 12 s on the pitch-shifted (Web Audio shaper) path, at 1x speed with +2 semitones, on both 44.1 kHz and 48 kHz profiles; (b) a rare ~22 ms gap with two clicks within about two seconds after changing speed (captured through the media element, so it may be the browser's time-stretcher or the capture path). Find out which are the app's, fix what is, then tighten `MAX_CLICKS` and `MAX_DROPOUT_MS` in that scenario to 0
- [ ] F.9 Practice tools: Pitch detection and Recording are covered (2.10, through the playback sheet's toolbox), but the Piano tool and the bottom-bar Practice tools tab are not; with a track playing there are two "Practice tools" buttons (the tab and the sheet's toolbox) and tapping the tab while the playback sheet is open is blocked (seen in 2.1 and 2.5); decide what the tab should show and add scenarios for Piano and the tab
