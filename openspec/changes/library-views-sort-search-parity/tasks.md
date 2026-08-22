## 1. Shared Sort Control Extraction

**Corrected per design.md's "Sort control placement" and "Extract a shared `SortFieldChipRow`" decisions (updated after finding Tags' sort already lives behind the filter popover, not inline in `SavedTagsList`):**

- [x] 1.1 Add a `SortFieldChipRow` presentational component to `packages/mobile-rehearsal-player/src/app/library/components/`, wrapping the existing generic `FilterChipGroup<Value>` (`library/search/components/library-search-filter-groups.tsx`) plus a direction-toggle `SurfaceIconButton`, per design.md's `SortFieldChipRowProps<Field>` shape, owning its own default styles matching the values currently duplicated across the existing call sites.
- [x] 1.2 Refactor the Tags `Sort` block in `library-search-controls.tsx` and the tag-detail screen's `Sort` block in `tags/components/tag-match-list/controls-panel.tsx` to render the new shared `SortFieldChipRow` instead of independently composing `FilterChipGroup` + `SurfaceIconButton`, keeping `sortSavedTagUsage`/`SavedTagsListSortState`, `TagMatchListSortState`, and all existing behavior unchanged. Files' own `Sort` block is left untouched (non-goal).
- [ ] 1.3 Add focused tests for `SortFieldChipRow` and re-run the existing Tags-list and tag-detail sort tests/behavior to confirm no regression from the refactor.

## 2. Tracks View Sort

- [ ] 2.1 Add a `sortSavedSourcesBy`-style comparator and sort state/options (`Name`/`Date added`, using `source.modifiedTime` for `Date added` to match Files' existing semantics) in a colocated model file for the Tracks browse surface.
- [ ] 2.2 Extend `canShowFilterPopover` (`screens/library/library-header-search-props.ts`) to include the Tracks view, add a Tracks `Sort` block (via the shared `SortFieldChipRow`) to `library-search-controls.tsx`'s filter popover, own the sort state in `use-saved-rehearsal-library-search.ts`, and apply the sort on top of `searchState.visibleSavedLibrarySources` before rendering rows in `BrowseSourceGroup`.
- [ ] 2.3 Add focused tests for the Tracks sort comparator (name case-insensitivity, date-added ordering, default state) and update/add a `browse-content`-level test if the render-branch wiring needs one, matching the existing test-coverage convention for this surface.

## 3. Loops View Sort

- [ ] 3.1 Add a `sortSavedLoopsBy`-style comparator and sort state/options (`Name`/`Date added`, using `loop.createdAt` for `Date added`) in a colocated model file for the Loops browse surface.
- [ ] 3.2 Extend `canShowFilterPopover` to include the Loops view, add a Loops `Sort` block (via the shared `SortFieldChipRow`) to `library-search-controls.tsx`'s filter popover, own the sort state in `use-saved-rehearsal-library-search.ts`, and apply the sort on top of `searchState.visibleSavedLoops` before rendering rows in the Loops section/list component.
- [ ] 3.3 Add focused tests for the Loops sort comparator, matching task 2.3's coverage shape.

## 4. Playlists View Sort

- [ ] 4.1 Add a `sortSavedPlaylistsBy`-style comparator and sort state/options (`Name`/`Date added`, using `playlist.createdAt` for `Date added`) in a colocated model file for the Playlists browse surface.
- [ ] 4.2 Extend `canShowFilterPopover` to include the Playlists view, add a Playlists `Sort` block (via the shared `SortFieldChipRow`) to `library-search-controls.tsx`'s filter popover, own the sort state in `use-saved-rehearsal-library-search.ts`, and apply the sort on top of `searchState.visiblePlaylistCards` before rendering cards in `BrowsePlaylistCards`.
- [ ] 4.3 Add focused tests for the Playlists sort comparator, matching task 2.3's coverage shape.

## 5. Entity Filter Reset Fix

- [ ] 5.1 Reset `entityFilter` to `'all'` when `selectedView` changes while `isLibrarySearchMode` is false, in `use-saved-rehearsal-library-search.ts` or an adjacent effects hook, per design.md's scoping (only reset when no active search, to avoid discarding an in-progress filtered search).
- [ ] 5.2 Add a focused test covering the reset-on-view-change behavior and confirming it does not fire while a search is active.

## 6. Final Validation

- [ ] 6.1 Manually verify in the integrated browser: each of Tracks/Loops/Playlists exposes working Name/Date-added sort (both directions), sort composes correctly with an active search query, Files and Tags sort remain visually and behaviorally unchanged after the shared-component refactor, and the Show-filter reset fix behaves as spec'd (reset when switching views with no active search, preserved mid-search).
- [ ] 6.2 Run project typecheck and lint on touched files, and the narrowest relevant Nx test targets for `mobile-rehearsal-player`, before considering this change ready to archive.
