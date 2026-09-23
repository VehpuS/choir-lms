## Why

A live design audit of `packages/mobile-rehearsal-player` (skills consulted: `design-audit`, `laws-of-ux`, `apple-hig-ios`, `music-ui-iconography`, `ui-consistency`; competitor research across Spotify, Apple Music, YouTube Music, and Deezer support docs; manual walkthrough of search, save, loop creation, playlists, folders, tags, queue, and Recents) found that several already-shipped requirements from `mobile-library-organization`, `recents-tag-navigation`, and `mobile-rehearsal-player-usability` are not actually working in the running app — most seriously, saved tags silently fail to persist and the tag editor's required suggestion row never renders. The audit also surfaced a handful of gaps the existing specs don't yet cover precisely enough to have caught (icon collisions between repeat and shuffle controls, a floating create button overlapping list-row controls, inconsistent save feedback). Fixing these now, while the audit context is fresh, restores the app to the behavior its own specs already promise and closes the small number of real coverage gaps behind it.

## What Changes

- **Bug fix**: saved tags do not persist. Editing tags on a track/loop/playlist, committing them as chips, and saving closes the sheet with no error, but reopening the editor (or checking Library > Tags / Recents > Popular tags) shows no tags were saved. Root-cause and fix.
- **Bug fix**: the tag editor's required suggestion row (`recents-tag-navigation` — "The tag editor suggests popular and matching existing tags") never renders in the running app. Restore it.
- **Bug fix**: playlist detail never offers a shuffle-play action (`mobile-rehearsal-player-usability` — "Playlist detail fresh-start playback uses icon-first ordered and shuffle actions"). Only an ordered-play control exists, and it is misplaced in the shared top app-bar rather than inside playlist detail. Restore the icon-first ordered/shuffle control row inside playlist detail itself.
- **Spec + fix**: strengthen `mobile-library-organization`'s tag-organization requirement with an explicit persistence/reflection scenario, and fix the underlying bug against it.
- **Spec + fix**: strengthen `mobile-library-organization`'s Files floating-create-button scenario so the control is also required not to obscure the current folder's last visible row, and fix the overlap (which currently produces inconsistent tap behavior depending on exact pixel position).
- **Spec + fix**: strengthen `mobile-rehearsal-player-ui`'s icon-semantics requirement so repeat and shuffle controls must stay visually distinct from each other (today "Repeat off" renders the same crossed-arrows glyph as the separate, adjacent shuffle button), and so drag-handle icon/placement stays consistent between playlist-detail rows and queue rows (today they use different icons in different row positions).
- **Spec + fix**: add a `mobile-rehearsal-player-usability` scenario requiring consistent, appropriately-scoped success acknowledgment after save actions (today, saving a loop shows a persistent "Loop saved" card while saving a track from Add shows nothing) and requiring such acknowledgments not to resurface as if new when a user returns to a screen later.
- **Design-only tasks** (no spec change — implementation/polish, tracked in `tasks.md`): reduce large unused vertical whitespace on short-content Library views; add a scroll-affordance hint to the horizontally-scrolling Library view-switcher pills; verify the native iOS build uses `MPVolumeView` rather than the custom volume slider observed on web, per `apple-hig-ios`.

## Capabilities

### New Capabilities

None — every finding fits inside an existing capability.

### Modified Capabilities

- `mobile-library-organization`: tag-based organization gains an explicit persistence/reflection scenario; the Files floating-create-button scenario gains a no-obscure-adjacent-row requirement.
- `mobile-rehearsal-player-ui`: icon-semantics requirement gains a repeat-vs-shuffle visual-distinctness scenario and a cross-surface drag-handle consistency scenario.
- `mobile-rehearsal-player-usability`: gains a save-acknowledgment consistency scenario (feedback shown, and not stale on return).

Two additional bugs are fixed against capabilities whose specs are already correct and do not need to change: `recents-tag-navigation` (tag suggestion row) and `mobile-rehearsal-player-usability`'s existing playlist shuffle-play scenario (see `design.md` and `tasks.md`).

## Impact

- Code: `packages/mobile-rehearsal-player/src/app/library/**` (tag editor, tag persistence/store, Files explorer FAB), `src/app/library/playlists/**` (playlist detail playback controls), `src/app/routing/playback/**` and shared icon/queue components (repeat/shuffle icons, drag handles), `src/app/library/components` / shared feedback-card primitives (save acknowledgment).
- No changes to playback/queue domain logic, Drive auth, or persisted data shapes beyond fixing the tag-save write path.
- No new dependencies expected.
