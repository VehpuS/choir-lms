## 1. Phase 0 — Bugs (tag persistence, FAB overlap, stale banners)

- [ ] 1.1 Add stateful test coverage for `saveTagEdits` in `use-saved-rehearsal-library-tag-editor.ts` (currently only the pure `resolveTagEditorTagsAndTitle` helper is tested) asserting that calling it persists tags and that a subsequent read reflects them.
- [ ] 1.2 Add stateful test coverage for `saveSource`/`persistSource` in `use-saved-rehearsal-library.ts` (currently only two pure exported helpers are tested) asserting the hook actually calls the repository and updates React state with the new tags.
- [ ] 1.3 Use the now-failing test(s) from 1.1/1.2 to pin the exact defect in the tag-save write path and fix it, for tracks, loops, and playlists alike.
- [ ] 1.4 Fix the adjacent staleness bug in `use-library-files.ts`: `canonicalIdsKey` is built only from entity IDs, so the Files-tree `refresh()` effect never re-fires on a tags-only change. Add a regression test.
- [ ] 1.5 Manually verify: tag a track, loop, and playlist; reopen each tag editor and confirm saved tags show; confirm Library > Tags and Recents > Popular tags reflect the new tag without navigating away and back.
- [ ] 1.6 Fix the Files-view (and other Library views') floating `+` create button overlapping the last visible row's overflow trigger — reserve bottom scroll padding for the control's footprint and verify hit-testing is unambiguous at the boundary.
- [ ] 1.7 Add/verify a test or manual check that a short folder listing's last row overflow menu opens reliably regardless of exact tap position near the FAB.
- [ ] 1.8 Scope success-acknowledgment banner state (starting with "Loop saved") to the action/entity that produced it instead of a bare boolean, so navigating away and back does not resurface a stale banner, and an explicitly dismissed banner stays dismissed.

## 2. Phase 1 — Hierarchy & discoverability

- [ ] 2.1 Replace the "Repeat off" icon in the Now Playing and Up Next/Queue repeat control with a dedicated repeat-family glyph (dimmed/inactive treatment) so it no longer reuses the shuffle crossing-arrows glyph; keep "Repeat one"/"Repeat all" as loop-icon variants.
- [ ] 2.2 Add a shuffle-start action to playlist detail alongside the existing ordered-start action, as an icon-first control row per the existing `mobile-rehearsal-player-usability` requirement.
- [ ] 2.3 Move the playlist-wide ordered/shuffle play controls out of the shared top app-bar (where ordered-play currently occupies the Filters icon slot) into the control row inside playlist detail from 2.2.
- [ ] 2.4 Find the shared Library-shell/view-switcher layout rule that reserves full remaining viewport height for the active view's content (e.g. a `flex: 1` or fixed-height wrapper) and fix it to size to actual content instead, so short lists stop padding themselves with empty space and longer lists show more rows before scrolling. Fix once at the shared layout level rather than patching each of Files/Tracks/Loops/Playlists/Tags independently; do not substitute filler content (e.g. contextual guidance) for the fix.

## 3. Phase 2 — Refinement

- [ ] 3.1 Add a persistent, explicitly-dismissible success card for Add's track-save action, matching the existing loop-save acknowledgment pattern; reuse the scoping fix from 1.8 so it doesn't go stale.
- [ ] 3.2 Implement the tag editor's suggestion row per the existing `recents-tag-navigation` requirement: popular tags when the input is empty, matching existing tags while typing, comma-aware scoping for multi-tag input, excluding tags already applied to the entity.
- [ ] 3.3 Converge the playlist-detail and Up Next/queue drag-handle icon and edge placement on one consistent treatment.
- [ ] 3.4 Add a scroll-affordance hint (e.g. fade edge) to the horizontally-scrolling Library view-switcher pill row.

## 4. Phase 3 — Native verification

- [ ] 4.1 Check whether the native iOS build's Now Playing volume control shares the same custom slider component observed on web, or already uses a native volume view.
- [ ] 4.2 If the native build shares the web fallback, swap it to `MPVolumeView` (or the RN equivalent) per `apple-hig-ios`; if it already differs, close this task with no code change and note the finding.

## 5. Validation

- [ ] 5.1 Run `npm exec -- nx run mobile-rehearsal-player:test` and `npm exec -- nx run mobile-rehearsal-player:typecheck` after each phase.
- [ ] 5.2 Manual regression pass covering the flows exercised in the original audit: search + save from Drive, loop creation, playlist creation/playback (ordered and shuffle), folder creation, tagging, queue/Up Next, waveform scrub/jump, Recents.
