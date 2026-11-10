# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Choir LMS is an Nx monorepo (npm workspaces) for a choir rehearsal/learning platform. The current focus is `packages/mobile-rehearsal-player`, an Expo/React Native app that turns Google Drive audio into loop-based rehearsal playlists. See [README.md](README.md) for product vision.

This repo's agent workflow policy was originally authored for GitHub Copilot as `AGENTS.md` plus glob-scoped `.github/instructions/*.instructions.md` files and `.github/skills/*/SKILL.md` skills (mirrored to `.cursor/`, `.codex/`, `.gemini/`, `.opencode/`, `.agents/`). Rather than copy that guidance into this file, it's wired into Claude Code directly:

- @AGENTS.md — repo-wide workflow policy (OpenSpec process, checkpointing, skill usage).
- @.github/instructions/workspace-install-and-target-policy.instructions.md — applies to any `package.json`/`package-lock.json`/`nx.json` edit, anywhere in the repo.
- @.github/instructions/typescript-coding-style-policy.instructions.md — applies to all `.ts`/`.tsx` files, anywhere in the repo.
- @.github/instructions/testing-policy.instructions.md — applies to all `*.spec.*`/`*.test.*` files, anywhere in the repo.

The two remaining instruction files are scoped to one directory subtree, so they live as `@`-imports in nested `CLAUDE.md` files instead (Claude Code loads a directory's `CLAUDE.md` automatically once you're working with files under it) — see [packages/mobile-rehearsal-player/src/CLAUDE.md](packages/mobile-rehearsal-player/src/CLAUDE.md) (folder/naming conventions) and [openspec/changes/CLAUDE.md](openspec/changes/CLAUDE.md) (deliberate execution loop).

`.github/skills/*/SKILL.md` already uses the same `name`/`description` frontmatter as Claude Code Agent Skills, so `.claude/skills/` holds one symlink per skill back to `.github/skills/<name>` — no content is duplicated, and every skill referenced below (and in AGENTS.md) is directly invokable. New skills only need to be added under `.github/skills/` plus a matching symlink in `.claude/skills/`.

This workspace uses npm workspaces with the committed root `package-lock.json`.
When repo-specific guidance conflicts with generic Nx examples, prefer
`npm exec -- nx ...` for workspace tasks and `npm ci` for install validation.

For cross-platform playback changes in the mobile app, review
`docs/mobile-cross-platform-audio-playback.md` first.

## Commands

Install (always use npm, never a global Nx CLI):

```sh
npm ci
```

Common Nx tasks (mirrors CI in `.github/workflows/ci.yml`):

```sh
npm exec -- nx sync:check                                    # validate Nx project graph sync
npm exec -- nx format:check --base=origin/main --head=HEAD   # PR-scoped format check
npm exec -- nx affected -t lint test typecheck build --base=origin/main --head=HEAD
npm exec -- nx run-many -t lint test typecheck build --all         # full check, as run on push to main
```

Single project / single test:

```sh
npm exec -- nx run <project>:test         # e.g. mobile-rehearsal-player, google-drive, audio-library-runtime
npm exec -- nx run mobile-rehearsal-player:test-file -- --file=src/path/to/file.spec.ts
npm exec -- nx run mobile-rehearsal-player:test-pattern -- --pattern='src/**/*.spec.ts'
```

Tests run via `tsx --test` using Node's built-in `node:test` + `node:assert/strict` — **not** Jest or Vitest, even though `jest-expo` appears as a dependency for ecosystem compatibility only. Mobile component specs use `@testing-library/react-native/pure` through the `src/test-support/` preload (see the testing policy). Match each package's existing `*.spec.ts`/`*.spec.tsx` naming; don't introduce `*.test.*` files or `__tests__` directories.

Browser scenarios (Playwright driving the web export against a mock library, mock Drive, generated audio and a fake microphone; no network, no Google sign-in):

```sh
npm exec -- nx run mobile-rehearsal-player:build-browser-test      # the export the scenarios serve
npx tsx tools/browser-session/run-scenarios.ts browser-session-output --scenario=<text>   # one scenario
npm exec -- nx run mobile-rehearsal-player:browser-test            # default lane (CI `browser` job)
npm exec -- nx run mobile-rehearsal-player:browser-test-matrix     # slow lane: device profiles, CPU, sample rates
```

Add or extend a scenario for any user-visible web change, and reproduce browser bugs as a failing scenario first; use the `browser-test-coverage` skill and read `tools/browser-session/README.md`.

Mobile-specific:

```sh
npm exec -- nx run mobile-rehearsal-player:typecheck-config   # tsc over app.config.ts / src/config
npm exec -- nx run mobile-rehearsal-player:typecheck          # tsc -b over the app
npm exec -- nx run mobile-rehearsal-player:build              # local expo export (default/CI build target)
npm exec -- nx run mobile-rehearsal-player:eas-build           # remote EAS build (explicit, not run by default)
npm exec -- nx run mobile-rehearsal-player:run-ios
npm exec -- nx run mobile-rehearsal-player:run-android
```

`mobile-rehearsal-player` reads Google Drive OAuth client IDs from `packages/mobile-rehearsal-player/.env` (`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` for web) — see [README.md](README.md#google-oauth-for-mobile-manual-testing) for keystore/SHA-1 setup needed for local Android auth testing.

OpenSpec status:

```sh
openspec list --json
openspec status --change "<change-name>"
```

## Architecture

**Workspace layout** (`packages/*`, each an npm workspace + Nx project):

- `audio-library-models` — framework-agnostic domain types/logic for the rehearsal library (tracks, loops, playlists, and composite tracks: the record, its edits, availability and the content models for sheet music and lyrics; also the library bundle format, its tolerant parser and upgrade steps, and the `importedFrom` provenance).
- `audio-library-runtime` — runtime/state logic built on the models package (depends on `audio-library-models`), including the library bundle builder, the additive import planner and executor, and `replaceLibrary` (staged swap with recovery on the next read).
- `google-drive` — Google Drive integration logic (depends on `audio-library-models`), including the bundle folders, upload, listing, pruning and the per-file access probe.
- `midi-notation` — turns MIDI files into MusicXML staves and lists their parts (depends on `audio-library-models`). It is the app's only lazily loaded workspace project, imported dynamically by the sheet music viewer; Nx forbids static imports of a lazily loaded project, so keep it out of static imports and put anything shared in `audio-library-models`.
- `pitch-detection` — turns microphone frames into sung notes: the `PitchEstimator` interface, a pitchy-backed estimator, level/clarity gates, a median smoother, and a note segmenter (depends on `audio-library-models`; pitchy is its only third-party dependency). Unlike `midi-notation` it is small enough to import statically; the lazy-loading rule does not apply. Note math shared with the piano and score (frequency to note and cents, `matchSungNote`, `centsZone`) lives in `audio-library-models`.
- `audio-mixing` — keeps a recording in step with its track: the clock-anchor fit, the recording timeline builder, the balance-to-gain mapping, the sync controller against small `Transport` and `Voice` interfaces with injected clocks, the offline mix renderer (`renderMix`, with a SoundTouch-backed `TrackStretcher` that loads `@soundtouchjs/core` by dynamic `import()` because it is ESM-only), and the punch range model, state machine and controller; for composite tracks, the stem gains (mute and solo), the mix presets and session mix, and the multi-stem offline renderer (`renderComposite`, with a SoundTouch `SumShaper` that also loads `@soundtouchjs/core` by dynamic `import()`) (depends on `audio-library-models`). Web Audio and media-element implementations stay in the app; it is small enough to import statically.
- `mobile-rehearsal-player` — the Expo/React Native app; depends on all of the above.

Shared packages are kept framework-agnostic; app-facing/framework-specific code lives in `mobile-rehearsal-player`. Prefer reusing/extending a shared package over duplicating domain logic in the app.

**Mobile app structure** (`packages/mobile-rehearsal-player/src/`):

- `src/app/App.tsx` + `src/app/routing/AppRouter.tsx` — a custom router; this app does **not** use Expo Router file-based routing.
- `src/app/screens/` — screen composition (grows into a folder with `index.tsx` when a screen needs multiple files).
- `src/app/library/` — the core domain surfaces, split by feature: `drive`, `loops`, `playlists`, `playback`, `recording`, `composite`, `search`, `saved-rehearsal-library`, `storage`, `bundle` (backup, restore, share, import and the access guide; a router-level host opens them from menu requests), plus shared `components`, `hooks`, `utils` for that domain.
- `src/app/components/` — cross-feature shared components only; feature-local UI stays with its owning feature.
- `src/config/` — runtime/config-only files.
- Platform divergence uses `.ios`/`.android`/`.native`/`.web` file siblings behind a shared API, rather than branching logic inline.

**Cross-platform playback** is the most architecturally involved part of the app: native iOS/Android uses `react-native-track-player` directly, while web patches media loading (authenticated Google Drive fetches replayed as blob URLs) and background/lock-screen transport is bridged through a module-level command handler. `shaka-player` is a required (but not directly imported) dependency of the web runtime path. Full module map and a flow diagram are in [docs/mobile-cross-platform-audio-playback.md](docs/mobile-cross-platform-audio-playback.md) — read it before touching anything under `src/app/library/playback/` or `src/app/library/composite/` (the composite engine, its player wrapper and the prepared-stem store are described there too).

**OpenSpec-driven change process**: product/implementation changes are proposed and tracked under `openspec/changes/` (proposal, design, specs, tasks) before implementation; completed changes move to `openspec/changes/archive/`. AGENTS.md and `.github/instructions/openspec-deliberate-execution.instructions.md` define a deliberate, one-subtask-at-a-time execution loop with review checkpoints — follow it by default unless the user opts out for the session.

**GitHub Pages deployment**: `.github/workflows/deploy-mobile-web-pages.yml` exports and deploys the mobile web build after `CI` succeeds on `main` (or via manual `workflow_dispatch`), using Expo's `EXPO_BASE_URL` from the configured Pages base path.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (in this repo, `npm exec -- nx ...`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
