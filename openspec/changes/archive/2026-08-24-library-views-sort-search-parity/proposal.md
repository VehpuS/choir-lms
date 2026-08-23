## Why

Files and the newly-added Tags view both let users choose how their saved-library rows are ordered — Files offers `Name`/`Type`/`Date added`/`Date opened` behind its filter popover, and Tags offers `Name`/`Count` (each ascending or descending) inline in its own view. The three other dedicated Library views — Tracks, Loops, and Playlists — already inherit the same shared app-library search (`useSavedRehearsalLibrarySearch` filters their visible lists regardless of which view is active), but have no sort control anywhere: rows always render in whatever order the storage layer persisted them in (alphabetical-by-name ascending, via a plain non-locale-aware comparator baked into `AsyncStoragePracticeRepository`'s save path — not something the user chose or can change). A user who wants to browse saved tracks/loops/playlists by, say, most-recently-added first has no way to do that. Auditing search separately confirmed it already works end-to-end for all three views, so this change is scoped to closing the sort gap, not re-plumbing search — with one small correctness fix surfaced during that audit (a stale Files-only filter can silently affect results after switching views).

## What Changes

- Add a per-view sort control to Tracks, Loops, and Playlists, reusing the inline pattern the Tags view just established (two field chips plus a shared ascending/descending direction toggle) rather than the Files-specific filter-popover mechanism.
- Tracks and Loops sort by `Name` or `Date added`; Playlists sort by `Name` or `Date added`. All default to `Name` ascending, matching the existing implicit order so switching to this change is not visually disruptive, and use the same case-insensitive name comparison Files and Tags already use.
- Sort applies on top of the existing shared search/filter results for each view (consistent with how Files sort already composes with Files search).
- Fix a related defect found during the search audit: the Files-only `Show` entity filter (`All`/`Tracks`/`Loops`/`Playlists`) is not reset when the user switches away from Files, so a filter value chosen while in Files can silently suppress Tracks or Playlists results after switching views without an active search. Reset it to `All` on view change.

### Non-Goals

- No change to Files' own sort mechanism, options, or filter-popover UI.
- No persistence of the new per-view sort selection across app restarts or view switches (matches the Tags view's current behavior, which also resets to its default on remount).
- No new sortable fields beyond `Name` and `Date added` for this pass (e.g. no `Type` for Tracks/Loops/Playlists, since each view is already single-entity-type).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mobile-library-organization`: adds a new requirement covering explicit, user-controlled browse order for the Tracks, Loops, and Playlists views (mirroring the existing Files-scoped "browse order is explicit and user-controlled" requirement), and adds a scenario to the existing search requirement covering entity-filter reset on view change.

## Impact

- **Code**: `packages/mobile-rehearsal-player/src/app/library/search/components/library-search-controls.tsx` and `packages/mobile-rehearsal-player/src/app/screens/library/library-header-search-props.ts` gain per-view `Sort` filter-popover blocks for Tracks/Loops/Playlists (reusing the existing filter-popover mechanism Files and Tags already use, not a new inline surface); `packages/mobile-rehearsal-player/src/app/library/components/` gains a new shared `SortFieldChipRow` component, also adopted by the existing Tags (`library-search-controls.tsx`) and tag-detail (`tags/components/tag-match-list/controls-panel.tsx`) sort blocks. `packages/mobile-rehearsal-player/src/app/library/components/saved-rehearsal-library-section/browse-source-group.tsx` (Tracks), `packages/mobile-rehearsal-player/src/app/library/loops/components/` (Loops section/list), `packages/mobile-rehearsal-player/src/app/library/playlists/components/` (Playlist cards) each gain a comparator following the pattern in `packages/mobile-rehearsal-player/src/app/library/tags/components/saved-tags-list/model.ts`, and sort state is added to `packages/mobile-rehearsal-player/src/app/library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search.ts` alongside the existing `tagsSortState`. `use-saved-rehearsal-library-section-state.ts` (or an effects hook alongside it) for the entity-filter reset fix.
- **No backend/API changes**: this is presentation-layer ordering over already-loaded local state; no new persisted fields or storage schema changes.
- **Depends on**: nothing blocking — the shared search plumbing this change composes with (`useSavedRehearsalLibrarySearch`, `filterSaved*ByQuery`) already exists and works for all three views today.
