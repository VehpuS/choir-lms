## 1. Recursive folder-match helper

- [x] 1.1 Add a `folderContainsMatchingEntity`-style helper (colocated in `library-files-model/`, e.g. `build-default-rows.ts` or a small sibling file) that, given a folder id, the file tree, the saved entity maps, and the active `entityFilter`/`selectedTagFilters`, uses `resolveRehearsalLibraryFolderSubtreeIds` to find the folder's full descendant-folder-id set and returns whether any file link in that set resolves to an entity matching both `matchesEntityFilter` and `matchesSelectedTags`, mirroring `buildSearchRows`'s per-item matching.
- [x] 1.2 Add focused tests for the helper: no filter active (trivially true or bypassed), matching entity one level down, matching entity several levels down, no matching entity anywhere in the subtree, entity-filter and tag-filter combined (both must pass), and a folder whose own tags match but contains no matching entity.

## 2. Apply filters during plain browsing

- [x] 2.1 Thread `entityFilter` and `selectedTagFilters` into the `buildDefaultRows` call in `library-files-model/index.ts` (currently only `sortDirection`/`sortMode`/`openedAtByNodeKey` are passed for the non-search path).
- [x] 2.2 In `build-default-rows.ts`, filter direct-child track/loop/playlist rows using `matchesEntityFilter`/`matchesSelectedTags` (same semantics as `buildSearchRows`), and filter direct-child folder rows using the new helper from 1.1 (visible if the folder's own tags match the active `Tags` filter, or it recursively contains a match) — but skip all of this filtering entirely when `entityFilter === 'all'` and `selectedTagFilters` is empty, so the default (no-filter) case has zero behavior change and no extra computation.
- [x] 2.3 Add focused tests in `library-files-model-sort.spec.ts` or a new colocated spec covering: `Show: Tracks` while browsing hides non-track leaf rows and folders with no track anywhere inside; a `Tags` filter while browsing hides non-matching leaf rows and folders with neither a matching tag nor a matching descendant; a folder matching only via its own tags stays visible; combining `Show` and a `Tags` filter narrows to items matching both; the no-filter (`all`, empty tags) case is byte-for-byte unchanged from current behavior.

## 3. Search toggle active-state parity

- [x] 3.1 In `library-search-controls-actions.tsx`, change the search `LibrarySearchActionButton`'s `isFilled` from the hardcoded `true` to `isSearchBarVisible`, matching the filter button's active-state pattern.
- [x] 3.2 Add or update a focused test confirming the resolved fill state for the search button tracks `isSearchBarVisible` (open → filled, closed → not filled), matching the existing test-coverage convention for this file/surface.

## 4. Active-filter dot indicator and summary chip

- [ ] 4.1 Add a `hasActiveFilters`-driven dot indicator to the filter `LibrarySearchActionButton` in `library-search-controls-actions.tsx` (e.g. via a new optional `showActiveIndicator` prop on `LibrarySearchActionButton`, passed `true` only for the filter button), visible independent of `isFilterPopoverVisible`, i.e. distinct from `hasActiveFilters`'s existing (separate) effect on the button's fill state.
- [ ] 4.2 Add a colocated pure helper (e.g. `resolveActiveFiltersSummaryLabel(entityFilter, selectedTagFilters)`) implementing design.md's label formula — entity-filter display label, pluralized tag count, joined with ` • ` when both are present, matching `getPlaylistDetailLabel`'s existing pluralize/join conventions — and focused tests covering: `entityFilter` only, tags only, both combined, and the `all`/empty (no label — chip should not render) case.
- [ ] 4.3 Render the summary chip in `library-search-controls.tsx` (or a small new colocated component), visible whenever `hasActiveFilters` is true regardless of `isFilterPopoverVisible`, using the label from 4.2; tapping it calls the same filter-popover-open handler already wired to the funnel icon.
- [ ] 4.4 Thread `hasActiveFilters` (already computed in `library-header-search-props.ts`) through to wherever 4.1 and 4.3 need it, reusing existing prop-threading paths (`search-shell.tsx`/`SavedRehearsalLibraryHeader`/`LibrarySearchControls`) rather than introducing a new one.

## 5. Final validation

- [ ] 5.1 Manually verify in the integrated browser: with a multi-level folder tree and mixed saved entity types, selecting `Show: Tracks`/`Loops`/`Playlists` while browsing (no search) narrows the current folder's rows and hides non-matching subfolders; selecting a `Tags` filter does the same; a subfolder several levels deep containing a lone match stays reachable from the top; clearing filters restores the original unfiltered listing; `Scope` and `Sort` continue behaving exactly as before.
- [ ] 5.2 Manually verify the header-control changes: the search toggle only renders filled while the search bar is open; the filter toggle shows its dot indicator whenever a `Show`/`Tags` filter is active, including after closing the popover; the summary chip appears in every Library view (not just Files) whenever a filter is active, shows the expected label for `Show`-only/`Tags`-only/combined cases, and tapping it reopens the filter popover.
- [ ] 5.3 Run project typecheck and lint on touched files, and the narrowest relevant Nx test targets for `mobile-rehearsal-player`, before considering this change ready to archive.
