## 1. Core matcher

- [x] 1.1 Add a `TagFilterMatchMode = 'all' | 'any'` type and change `matchesSelectedTags` (`packages/mobile-rehearsal-player/src/app/library/search/utils/saved-library-search-view-model.ts`) to require a `matchMode` option, using `.some(...)` for `'any'` and keeping `.every(...)` for `'all'`. No default value for `matchMode` — every call site must pass it explicitly. (All 4 call sites across the package were updated to pass `matchMode: 'all'` explicitly as a temporary placeholder preserving current behavior, since `filterSaved*ByQuery`, `buildDefaultRows`, `buildSearchRows`, and `folderContainsMatchingEntity` don't yet expose/thread the real state — that threading is done in subtasks 2.3, 3.2, 3.3, 3.4.)
- [x] 1.2 Add focused tests for `matchesSelectedTags` covering: `all` mode requires every selected tag (existing behavior, unchanged), `any` mode matches with only one of several selected tags present, `any` mode still returns `false` when the entity has none of the selected tags, and the existing no-selected-tags-trivially-true / no-entity-tags-false edge cases hold under both modes. (Added as a new colocated `matches-selected-tags.spec.ts` rather than growing `saved-library-search-view-model.spec.ts` past the 300-line limit.)

## 2. Shared state

- [x] 2.1 Add `tagFilterMatchMode` state (`useState<TagFilterMatchMode>('all')`) to `useSavedRehearsalLibrarySearch` (`packages/mobile-rehearsal-player/src/app/library/components/saved-rehearsal-library-section/use-saved-rehearsal-library-search.ts`), alongside `selectedTagFilters`. Add a `setTagFilterMatchMode` (or `toggleTagFilterMatchMode`) action to the hook's return value, matching the existing `toggleTagFilter` naming convention. (Added `toggleTagFilterMatchMode()` as a no-arg binary flip, matching the existing `toggleFilesSortDirection()` precedent. This edit pushed the hook file over the 300-line lint threshold, so the pre-existing Files-view search/sort/scope state cluster — `filesSearchScope`, `filesSortMode`, `filesSortDirection`, `filesOpenedAtByNodeKey`, and their setters/actions/`restoreLibraryFilesSearchState` wiring — was extracted into a new colocated `use-library-files-search-state.ts` hook, with the parent hook's public API left unchanged.)
- [ ] 2.2 Reset `tagFilterMatchMode` back to `'all'` inside `clearLibrarySearch()`, in the same place `selectedTagFilters` is reset to `[]`. Do not reset it in the view-change effect that resets `entityFilter` — `tagFilterMatchMode` follows `selectedTagFilters`'s existing global, not-reset-on-view-change scope.
- [ ] 2.3 Thread `tagFilterMatchMode` into the three `filterSaved*ByQuery` helpers (`filterSavedLibrarySourcesByQuery`, `filterSavedLoopsByQuery`, `filterSavedPlaylistsByQuery` in `saved-library-search-view-model.ts`) as a new required option, passed through to their internal `matchesSelectedTags` calls; update the `visibleSavedLibrarySources`/`visibleSavedLoops`/`visiblePlaylistCards` `useMemo` calls in `use-saved-rehearsal-library-search.ts` to pass the new state (and their dependency arrays).
- [ ] 2.4 Add or update focused tests in `saved-library-search-view-model.spec.ts` covering `any` vs `all` mode for at least one of the three `filterSaved*ByQuery` helpers, mirroring the existing tag-filter test coverage there.

## 3. Files browsing and search

- [ ] 3.1 Add `tagFilterMatchMode: TagFilterMatchMode` to `LibraryFilesSearchOptions` (`library-files-model/types.ts`); thread it from `index.ts`'s `buildLibraryFilesExplorerState` into both `buildDefaultRows` and `buildSearchRows` calls, alongside the existing `entityFilter`/`selectedTagFilters` threading.
- [ ] 3.2 Update `build-default-rows.ts`'s direct-child track/loop/playlist filtering and its `folderContainsMatchingEntity` call to pass the resolved `tagFilterMatchMode` through; update the `hasActiveFilter` bypass guard to remain correct (still `entityFilter === 'all' && selectedTags.length === 0`, independent of mode — mode is meaningless with zero selected tags).
- [ ] 3.3 Update `build-search-rows.ts`'s per-item `matchesSelectedTags` calls (track/loop/playlist rows and the folder-tag-match branch) to pass `tagFilterMatchMode`.
- [ ] 3.4 Update `folder-contains-matching-entity.ts`'s `folderContainsMatchingEntity` signature to accept and pass through `matchMode` to its internal `matchesSelectedTags` calls.
- [ ] 3.5 Add or update focused tests covering `any` mode for: `folderContainsMatchingEntity` (a folder recursively contains a match under `any` mode that it would not match under `all`), `buildDefaultRows`/plain browsing (an `any`-mode filter with two tags surfaces entities matching just one), and `buildSearchRows` (same, during an active search).

## 4. Match-mode toggle control

- [ ] 4.1 Restructure the `TAGS` filter group in `library-search-filter-popover.tsx` to use a label-row layout (label + trailing control), matching the existing `filterLabelRow`/`trailingAction` shape `FilterChipGroup` already uses for the `Sort` group's direction toggle.
- [ ] 4.2 Add the match-mode toggle as an `InteractionChip` reading `Match: All` / `Match: Any`, tapping to flip `tagFilterMatchMode`; wire `onSelectValue`-equivalent prop threading from `LibrarySearchFilterPopover` up through `LibrarySearchControls`/`SavedRehearsalLibrarySearchShell` the same way `selectedTagFilters`/`onToggleTagFilter` are already threaded.
- [ ] 4.3 Add or update a focused test for the toggle's resolved label/state transition (`all` → shows "Match: All", tapping flips to `any` → "Match: Any"), matching this codebase's convention of testing derived UI state via a colocated pure helper rather than rendering the component.

## 5. Active-filters summary chip

- [ ] 5.1 Add a `tagFilterMatchMode` parameter to `resolveActiveFiltersSummaryLabel` (`library-search-active-filters-model.ts`); append ` (any)` to the tag-count segment only when `tagFilterMatchMode === 'any'` and at least one tag is selected, leaving the `all`-mode (default) label unchanged.
- [ ] 5.2 Thread `tagFilterMatchMode` from `SavedRehearsalLibrarySearchShell`/`LibrarySearchControls` into the `resolveActiveFiltersSummaryLabel` call, reusing the same prop-threading path already carrying `entityFilter`/`selectedTagFilters` to that call site.
- [ ] 5.3 Add or update focused tests covering: tags-only label under `all` mode (unchanged `N tags`), tags-only label under `any` mode (`N tags (any)`), and combined `Show` + tags labels under both modes.

## 6. Final validation

- [ ] 6.1 Manually verify in the integrated browser: selecting two or more tags with `Match: All` narrows to entities carrying every tag (today's behavior, unchanged); switching to `Match: Any` broadens results to entities carrying at least one of the selected tags, across Files browsing, Files search, and the Tracks/Loops/Playlists/Tags views; the active-filters summary chip shows the `(any)` suffix only in `Any` mode; clearing search resets the mode back to `All`; switching Library views preserves the mode.
- [ ] 6.2 Run project typecheck and lint on touched files, and the narrowest relevant Nx test targets for `mobile-rehearsal-player`, before considering this change ready to archive.
