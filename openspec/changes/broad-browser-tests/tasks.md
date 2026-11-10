## 1. Tooling

- [x] 1.1 Network guard in `openMockLibrarySession` and `runScenario` (fails on undeclared hosts), with a scenario that proves it
- [x] 1.0 Commit fixtures: `choir-stem.m4a`, the full MIDI file and the full MusicXML score under `src/test-support/fixtures/`, with a spec that checks they exist, parse, and keep the fixture directory under the size budget; `.gitattributes` entry for the MusicXML
- [x] 1.2 `buildToneWav` and Drive/web-link media serving with `Range` support, serving the stem as `audio/mp4` and an AAC codec probe
- [ ] 1.3a Audio output tap, forced sample rate, CPU throttle and device profiles (quick and full), plus the PCM quality analyzer (pitch drift, clicks, dropouts, clipping, loudness) with unit specs on synthetic signals
- [x] 1.3 Fake microphone fed by the stem (launch flags, WAV transcode helper) and a recording-capable session option
- [ ] 1.4 Page helpers (`openTab`, `openTrackMenu`, `expectToast`, `expectNoConsoleErrors`) and trace + console capture on failure
- [ ] 1.5 Fixture builders for loops, playlist items, tags, markers, lyrics, composites and recordings, each with a round-trip spec
- [ ] 1.6 Migrate the older scenarios onto `runScenario`; `browser-test` `--scenario=` filter

## 2. Scenarios (one subtask per area; each offline)

- [ ] 2.1 Shell navigation and view restore
- [ ] 2.2 Library tracks and files (search, folders, bulk selection)
- [ ] 2.3 Playlists
- [ ] 2.4 Loops
- [ ] 2.5 Playback, speed/pitch and queue, with the slowdown quality checks, readout/engine agreement and a ten-minute track
- [ ] 2.6 Markers and lyrics
- [ ] 2.7 Tags and search
- [ ] 2.8 Drive flows (import review, reconnect, offline files)
- [ ] 2.9 Backup, restore and share (bundles generated with the runtime builder)
- [ ] 2.10 Recordings, including the stem's pitches: E4 then C4 through the app's segmenter, and E4, C♯4, C4 in the raw frames (C♯4 is a brief slide, measured in 1.3)
- [ ] 2.11 Composite tracks
- [ ] 2.12 Settings
- [ ] 2.13 Sheet music beyond PDF (full MusicXML as `.musicxml` and `.mxl`, and MIDI-derived notation)

## 3. Agent guidance and CI

- [ ] 3.1 `browser-test-coverage` skill with `.claude/skills/` symlink
- [ ] 3.2 `AGENTS.md`, `CLAUDE.md`, testing policy and `mobile-web-runtime-debugging` updates; refresh `tools/browser-session/README.md`
- [ ] 3.3a `browser-test-matrix` target (device descriptors, CPU throttling, sample rates; `--browser=webkit` on demand with `requires` skipping, WebKit installed only by that target)
- [ ] 3.3 CI uploads traces; confirm total `browser` job time and note whether sharding is needed

## Follow-ups

Unrelated bugs, findings, ideas, improvements and questions met while implementing or browser testing are recorded here as `F.n` subtasks, done after the planned tasks and before archiving.

- [ ] F.1 `tools/browser-session/` is outside every lint and typecheck target (seen in 1.1), so scenario and helper TypeScript is never checked by `nx lint`; add a typecheck/lint target (and `tsconfig`) covering it and fix what it finds
- [ ] F.2 Playing a Drive track on web logs `Failed to load resource: net::ERR_FILE_NOT_FOUND` for a `blob:` URL (seen in 1.2, a generated tone played from the Library tab); find out whether the player revokes a blob URL too early or this is harmless, then fix or document it as baseline noise
