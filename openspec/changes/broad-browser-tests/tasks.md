## 1. Tooling

- [ ] 1.1 Network guard in `openMockLibrarySession` and `runScenario` (fails on undeclared hosts), with a scenario that proves it
- [ ] 1.2 `buildToneWav` and Drive/web-link media serving with `Range` support
- [ ] 1.3 Fake microphone launch flags and a recording-capable session option
- [ ] 1.4 Page helpers (`openTab`, `openTrackMenu`, `expectToast`, `expectNoConsoleErrors`) and trace + console capture on failure
- [ ] 1.5 Fixture builders for loops, playlist items, tags, markers, lyrics, composites and recordings, each with a round-trip spec
- [ ] 1.6 Migrate the older scenarios onto `runScenario`; `browser-test` `--scenario=` filter

## 2. Scenarios (one subtask per area; each offline)

- [ ] 2.1 Shell navigation and view restore
- [ ] 2.2 Library tracks and files (search, folders, bulk selection)
- [ ] 2.3 Playlists
- [ ] 2.4 Loops
- [ ] 2.5 Playback, speed/pitch and queue
- [ ] 2.6 Markers and lyrics
- [ ] 2.7 Tags and search
- [ ] 2.8 Drive flows (import review, reconnect, offline files)
- [ ] 2.9 Backup, restore and share
- [ ] 2.10 Recordings
- [ ] 2.11 Composite tracks
- [ ] 2.12 Settings
- [ ] 2.13 Sheet music beyond PDF

## 3. Agent guidance and CI

- [ ] 3.1 `browser-test-coverage` skill with `.claude/skills/` symlink
- [ ] 3.2 `AGENTS.md`, `CLAUDE.md`, testing policy and `mobile-web-runtime-debugging` updates; refresh `tools/browser-session/README.md`
- [ ] 3.3 CI uploads traces; confirm total `browser` job time and note whether sharding is needed
