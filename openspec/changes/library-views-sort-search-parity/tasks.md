## 1. Shared Sort Control Extraction

- [ ] 1.1 Extract a generic `SortFieldChipRow` presentational component (field chips + ascending/descending direction toggle) out of `SavedTagsList`'s existing inline sort row into `packages/mobile-rehearsal-player/src/app/library/components/`, parameterized over the field type per design.md's `SortFieldChipRowProps<Field>` shape.
- [ ] 1.2 Refactor `SavedTagsList` to render the new shared `SortFieldChipRow` instead of its bespoke chip/toggle JSX, keeping `sortSavedTagUsage`/`SavedTagsListSortState` and all existing Tags-specific behavior unchanged.
- [ ] 1.3 Add/port focused tests for `SortFieldChipRow` (or its accessibility-label/interaction model helpers) and re-run the existing `SavedTagsList` sort tests to confirm no behavior regression from the refactor.

## 2. Tracks View Sort

- [ ] 2.1 Add a `sortSavedSourcesBy`-style comparator and sort state/options (`Name`/`Date added`, using `source.modifiedTime` for `Date added` to match Files' existing semantics) in a colocated model file for the Tracks browse surface.
- [ ] 2.2 Wire local sort state and the shared `SortFieldChipRow` into `BrowseSourceGroup` (or its containing Tracks view composition), applying the sort on top of `searchState.visibleSavedLibrarySources` before rendering rows.
- [ ] 2.3 Add focused tests for the Tracks sort comparator (name case-insensitivity, date-added ordering, default state) and update/add a `browse-content`-level test if the render-branch wiring needs one, matching the existing test-coverage convention for this surface.

## 3. Loops View Sort

- [ ] 3.1 Add a `sortSavedLoopsBy`-style comparator and sort state/options (`Name`/`Date added`, using `loop.createdAt` for `Date added`) in a colocated model file for the Loops browse surface.
- [ ] 3.2 Wire local sort state and the shared `SortFieldChipRow` into the Loops section/list component, applying the sort on top of `searchState.visibleSavedLoops` before rendering rows.
- [ ] 3.3 Add focused tests for the Loops sort comparator, matching task 2.3's coverage shape.

## 4. Playlists View Sort

- [ ] 4.1 Add a `sortSavedPlaylistsBy`-style comparator and sort state/options (`Name`/`Date added`, using `playlist.createdAt` for `Date added`) in a colocated model file for the Playlists browse surface.
- [ ] 4.2 Wire local sort state and the shared `SortFieldChipRow` into `BrowsePlaylistCards` (or its containing Playlists view composition), applying the sort on top of `searchState.visiblePlaylistCards` before rendering cards.
- [ ] 4.3 Add focused tests for the Playlists sort comparator, matching task 2.3's coverage shape.

## 5. Entity Filter Reset Fix

- [ ] 5.1 Reset `entityFilter` to `'all'` when `selectedView` changes while `isLibrarySearchMode` is false, in `use-saved-rehearsal-library-search.ts` or an adjacent effects hook, per design.md's scoping (only reset when no active search, to avoid discarding an in-progress filtered search).
- [ ] 5.2 Add a focused test covering the reset-on-view-change behavior and confirming it does not fire while a search is active.

## 6. Final Validation

- [ ] 6.1 Manually verify in the integrated browser: each of Tracks/Loops/Playlists exposes working Name/Date-added sort (both directions), sort composes correctly with an active search query, Files and Tags sort remain visually and behaviorally unchanged after the shared-component refactor, and the Show-filter reset fix behaves as spec'd (reset when switching views with no active search, preserved mid-search).
- [ ] 6.2 Run project typecheck and lint on touched files, and the narrowest relevant Nx test targets for `mobile-rehearsal-player`, before considering this change ready to archive.
