## Why

Issue #48. The app has five browser scenarios (`tools/browser-session/*.scenario.ts`) that each came out of one bug or feature (#36, #40, #42, sheet music). Most of the app — playback, loops, playlists and the queue, search, Settings, backup/restore/share, recordings, composite tracks, offline files — has no rendered-browser coverage, and unit specs cannot catch layout, routing, sheet or storage-wiring regressions. Scenarios also repeat the same setup (the `main`/`try`/`finally` shell in the older ones, label-based locators, hand-built fixtures) and nothing tells a future agent session to add to them or to reach for them when reproducing a bug.

## What Changes

- Review the app and add a suite of browser scenarios covering the user-critical flows, listed per area in `design.md` and the spec. Every scenario runs offline against mocks: no Google sign-in, no live Drive, no live audio or microphone, no external URLs.
- Tooling and reusable helpers in `tools/browser-session/`:
  - a **network guard** that fails any scenario that makes a request to a host other than the local server or a declared mock;
  - **deterministic media**: a generated WAV (known length and tone) served as Drive media and web-link audio, plus a fake audio device for the microphone and a controllable media clock, so playback, loops, markers and recording can be asserted without sound;
  - **mock Drive growth**: folders, media download, upload and share responses, driven from the same `MockDriveAccount`;
  - **page helpers** (`openTab`, `openTrackMenu`, `expectToast`, `readStored`, `expectNoConsoleErrors`) and a **fixture builder** set that extends `mock-library-fixtures` (loops, playlists with items, tags, markers, lyrics, composite tracks, recordings);
  - scenarios migrated off the hand-rolled `main()` shell onto `runScenario`, and `browser-test` accepting a name filter (`--scenario=<substring>`) so one scenario runs fast.
- Agent documentation: a `browser-test-coverage` skill (when and how to add scenarios, run one, reproduce a bug as a scenario first), a "Browser tests" section in `AGENTS.md` and `CLAUDE.md`, a link from `mobile-web-runtime-debugging`, and a coverage-expectation line in the testing policy.
- CI keeps running `browser-test` in the `browser` job; failures keep uploading screenshots, and now also traces.

Not included: real Google OAuth, real audio output or microphone capture, native (iOS/Android) UI automation, visual-diff baselines.

## Capabilities

### New Capabilities

- `browser-testing`: what the browser suite covers, the offline guarantee, the helper surface and the agent workflow around it.

## Impact

- `tools/browser-session/` (helpers, scenarios), `packages/mobile-rehearsal-player/src/test-support/` (fixtures), `mobile-rehearsal-player` `browser-test` target, `.github/workflows/ci.yml` (trace upload).
- Docs and skills: `AGENTS.md`, `CLAUDE.md`, `.github/skills/browser-test-coverage/` plus its `.claude/skills/` symlink, `mobile-web-runtime-debugging`, `testing-policy.instructions.md`, `tools/browser-session/README.md`.
- No runtime app behavior changes. Where a scenario needs a stable hook the app lacks, it adds an `accessibilityLabel`, nothing more.
