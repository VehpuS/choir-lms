---
name: mobile-folder-structure
description: "Apply Expo-inspired folder structure conventions in the mobile rehearsal player. USE WHEN requests mention folder structure, naming conventions, test naming, file organization, moving files, reducing flat directories, grouping related files, colocating tests, standardization passes, or cleaning up packages/mobile-rehearsal-player. TRIGGERS: 'folder structure', 'organize files', 'rename files', 'test names', 'kebab-case', 'flat directory', 'group these files', 'colocate tests', 'screen folder', 'mobile architecture', 'standardization pass'."
---

# Mobile Folder Structure (Expo-Inspired)

Use this skill when reorganizing or extending `packages/mobile-rehearsal-player` so the app stays easier to navigate as it grows.

This app already follows Expo's `src/` recommendation, but it does not use Expo Router file-based routes. Treat `src/app/routing/` as the shell and navigation layer, and keep actual screen and feature composition outside that layer where possible.

Primary goals:

- reduce flat directories with unclear ownership
- standardize new file and folder naming toward kebab-case
- keep shared code separate from feature-local code
- colocate helpers, subcomponents, and tests with the feature that owns them
- avoid gratuitous churn when the task is not a cleanup or standardization pass

## Baseline Conventions

### 1. Keep `src/` as the app-code boundary

- Keep application code in `packages/mobile-rehearsal-player/src/`.
- Keep runtime and config-only files in `src/config/`.
- Do not move app code back to the package root.

### 2. Respect the current app architecture

- `src/app/App.tsx` and `src/app/routing/app-router.tsx` are the entry path.
- Keep routing files thin. If a routing surface accumulates view logic, extract that logic into a feature folder and leave the router or shell file as the composition boundary.
- Do not introduce Expo Router-style route files unless the task explicitly includes a routing migration.

### 3. Prefer kebab-case for new files and folders

- New files and folders should default to kebab-case.
- React component exports stay PascalCase even when the file is kebab-case.
- Keep hook names in the `use-foo.ts` form.
- When the task is a focused feature change, avoid unrelated rename churn outside the area you are already touching.
- When the user explicitly asks for a standardization or cleanup pass, rename legacy files and update legacy code as needed to bring the targeted surface into the new convention.

Examples:

- `saved-playlist-detail-card.tsx` exporting `SavedPlaylistDetailCard`
- `use-saved-track-playback.ts`
- `queue-surface-row-model.ts`

### 4. Group by feature or surface, not only by file type

Prefer the smallest folder boundary that gives the files one clear owner.

- Keep `src/app/components/` for components reused across multiple feature areas.
- Keep feature-local code inside the feature that owns it.
- Avoid adding more unrelated siblings into already flat directories such as:
  - `src/app/routing/`
  - `src/app/screens/`
  - `src/app/library/components/`
  - `src/app/library/saved-rehearsal-library/`
  - `src/app/library/storage/`

Use surface-oriented groupings when a slice grows past a single file. In the current app that usually means folders such as:

- `routing/playback/`
- `routing/queue/`
- `routing/shell/`
- `screens/recents/`
- `library/playlists/`
- `library/loops/`
- `library/drive/`
- `library/search/`
- `auth/google-drive/`

### 5. Keep screen and route boundaries explicit

- Screen-level composition belongs under `src/app/screens/`.
- When a screen needs multiple files, move it into a screen folder with a stable entry file such as `index.tsx`.
- Route and shell files should import screen or surface modules instead of accumulating helpers, styles, and models inline.

### 6. Use component folders when a surface splits into multiple files

- If a component or surface needs subcomponents, helpers, styles, and tests, create a folder for it.
- Use `index.tsx` or `index.ts` as the public entry when you want to preserve import paths during a refactor.
- Keep folder-internal helpers next to the entry file instead of leaking them into a top-level shared directory.

### 7. Colocate styles unless they are genuinely shared

- Default to keeping styles at the bottom of the component file.
- Extract a separate style module only when multiple files in the same feature share it and the shared file improves readability.
- Avoid creating new `*-styles.ts` files for one component by default.

### 8. Colocate tests with one filename standard

- Use colocated kebab-case `*.spec.ts` or `*.spec.tsx` files for mobile tests.
- Do not introduce `*.test.*` files or new `__tests__` directories in `packages/mobile-rehearsal-player/src/`.
- When you are already reorganizing a legacy surface, migrate its tests toward colocated `*.spec.*` files.
- This package's `typecheck-tests` and `mobile-rehearsal-player:test` targets discover colocated `*.spec.*` files under `src/**` automatically.

### 9. Isolate platform-specific implementations cleanly

- Use `.ios`, `.android`, `.native`, or `.web` siblings when behavior diverges materially.
- Keep the public props and import path identical across platform files.

## Execution Protocol

1. Identify the user-facing surface you are changing.

- Pick one owner: playback, queue, recents, drive auth, playlists, loops, search, or shared shell.

2. Decide whether the code is shared or feature-local.

- Shared across multiple surfaces goes in a shared folder.
- Otherwise keep it with the owning feature.

3. Make the clearest structural change that materially improves legibility.

- Prefer decisive regrouping over slow incremental shuffling when the current structure is hard to scan.
- If clarity requires a broader folder split inside the targeted surface, do that instead of leaving the directory half-standardized.
- Preserve import stability with an `index` entry when useful.
- If the refactor requires moving substantive code blocks across files and you need resumable, marker-based tracking, invoke `code-move-checkpointed`.

4. Normalize naming inside the touched slice.

- Use kebab-case for new files.
- Use colocated `*.spec.ts` or `*.spec.tsx` names for mobile tests.
- Rename existing files when the refactor clearly improves coherence.
- If the user requested a standardization pass, treat legacy naming cleanup as part of the task rather than something to avoid.
- If the targeted area is still hard to read after a small move, keep going until the ownership and naming are actually clearer.

5. Validate after structural edits.

- Run `npm exec -- nx run mobile-rehearsal-player:typecheck`.
- Run `npm exec -- nx run mobile-rehearsal-player:typecheck-tests` when test files move or new tests are added.
- Run `npm exec -- nx run mobile-rehearsal-player:test` when the touched tests are part of the explicit runner or after updating that runner.

## Recommended Initial Refactor Targets

These are good candidates when the user asks for cleanup:

- `src/app/routing/` into playback, queue, and shell-oriented folders
- `src/app/screens/` into per-screen folders such as `recents/`
- root `src/app/library/components/` and leftover top-level library files into drive, playlists, loops, search, saved-rehearsal-library, or storage-owned folders
- `src/app/auth/` into provider-specific folders when auth logic expands

## Done Criteria

- New structure makes file ownership easier to infer without opening many files.
- New files follow kebab-case naming, and standardized legacy files follow it within the cleanup scope.
- Shared code is separated from feature-local code.
- Routing files remain thinner than the surfaces they compose.
- Validation covers any moved or newly added tests.
- Code relocation work that needed resumable checkpoints used `code-move-checkpointed` instead of ad-hoc move tracking.
