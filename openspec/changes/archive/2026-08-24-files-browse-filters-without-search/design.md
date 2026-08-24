## Context

`Files`' browse pipeline (`packages/mobile-rehearsal-player/src/app/library/saved-rehearsal-library/library-files-model/index.ts`) branches on whether a search query is active:

- With an active query, `buildSearchRows` runs: it reads `entityFilter` and `selectedTagFilters` from `LibraryFilesSearchOptions`, applies them via the already-generic `matchesEntityFilter`/`matchesSelectedTags` helpers (`library/search/utils/saved-library-search-view-model.ts`), and — because search flattens matches from the whole scoped subtree (current-folder or all-files) into one list with `prefixContainingPath` location labels — folders are handled specially: a folder row appears only when `entityFilter === 'all'`, and even then only if the _folder's own_ tags match.
- Without an active query, `buildDefaultRows` runs: it lists exactly the direct children (folders and file-linked entities) of `currentFolder`, one level at a time, drill-down style. It receives `sortMode`/`sortDirection` and applies them, but never receives `entityFilter` or `selectedTagFilters` at all — so `Show` and `Tags` selections are silently no-ops while just browsing.

This is the bug: a user who sets `Show: Tracks` or picks a tag while browsing (not searching) sees the exact same rows as with no filter active. The existing spec's "Filter by one or more tags" scenario already describes filtering "visible saved entities" without carving out an active-search precondition, so today's plain-browsing behavior doesn't match the spec's own intent.

## Goals / Non-Goals

**Goals:**

- Make `Show` (entity-type) and `Tags` filters take effect while plain-browsing a folder, using the same matching semantics (`matchesEntityFilter`, `matchesSelectedTags`) already proven in `buildSearchRows`, so filtered results are consistent whether or not a search is active.
- Preserve the existing one-level-at-a-time, drill-down browsing model — this is not a switch to search's flatten-everything-with-location-labels presentation. A filtered folder listing still shows exactly the current folder's direct children; only _which_ children appear changes.
- Decide what happens to a subfolder when a filter would otherwise hide everything inside it: show the subfolder only if it recursively contains at least one entity that matches the active filter(s), so users can still drill down to reach matches instead of a folder silently vanishing along with everything it contains transitively.

**Non-Goals:**

- `Scope` (`This folder` / `All Files`) stays a search-only concept; this change does not give it meaning during plain browsing.
- No change to `buildSearchRows`'s existing behavior or to how filters behave while a search is active.
- No change to `Sort`, which already applies during plain browsing.
- No flattening of nested matches into the current level with location labels (that's search's presentation model, not this one).

## Decisions

### Reuse the existing entity/tag matching helpers, don't reimplement them

`matchesEntityFilter` and `matchesSelectedTags` (`library/search/utils/saved-library-search-view-model.ts`) are already query-agnostic — they take an entity's type/tags and the active filter values, with no dependency on search state. `buildDefaultRows` will import and call them directly, the same way `buildSearchRows` already does, for each direct-child track/loop/playlist row in the current folder.

**Alternative considered:** duplicate a simplified matching check local to `buildDefaultRows`. Rejected — these helpers are already the single source of truth for "does this entity match the active filters," and duplicating them risks the two browsing modes silently disagreeing on what counts as a match.

### A subfolder is visible if it recursively contains at least one matching entity (or its own tags match, for the Tags filter)

When `Show`/`Tags` filters are active, a direct child folder of `currentFolder` is included in the listing if either:

1. Its own tags match the active `Tags` filter (`matchesSelectedTags({ selectedTags, tags: folder.tags })`) — folders are independently taggable per the existing "Folder tags remain local to the folder node" scenario, so a folder that is itself tagged with the selected tag should surface even if nothing inside it happens to match; or
2. It recursively contains at least one track/loop/playlist whose entity type passes `matchesEntityFilter` **and** whose tags pass `matchesSelectedTags` (both conditions combined the same way `buildSearchRows` already combines them per-item) — computed via the existing `resolveRehearsalLibraryFolderSubtreeIds(folder.id, tree.folders)` (already exported from `@org/audio-library-runtime` and already used by `pathing.ts`'s `buildScopedFolderIds` for search's own subtree scoping) to get the folder's full descendant-folder-id set, then scanning `tree.fileLinks` for any link whose `parentFolderId` falls in that set and whose resolved entity matches.

A folder that matches by either rule still opens and navigates normally — matching does not change what's inside it, only whether the folder itself appears in its parent's listing. The direct-child entity rows (tracks/loops/playlists) themselves use only the item-level match check (rule 2's per-item test, not recursive — they have no descendants).

**Alternative considered:** hide a folder unless it recursively contains a match, ignoring the folder's own tags entirely. Rejected — this would make a folder the user directly tagged with the exact tag they're filtering by disappear whenever nothing inside it happens to share that tag, which is a more surprising outcome than including it.

**Alternative considered (the one this proposal explicitly rejects, per confirmation):** keep all folders always visible regardless of active filters, only filtering the direct leaf rows at each level. Rejected — a user filtering by `Show: Tracks` two folders deep from any actual track would see nothing but a wall of unfiltered, empty-looking folders at the top level with no indication which one to open.

### No new state or types

`entityFilter` and `selectedTagFilters` already exist on `LibraryFilesSearchOptions` and already flow from `useSavedRehearsalLibrarySearch` through to `buildLibraryFilesExplorerState`. The fix is entirely inside `library-files-model/index.ts` (pass both fields into `buildDefaultRows`, not just when building search rows) and `build-default-rows.ts` (apply them). No prop, hook, or type signature outside `library-files-model` needs to change.

### Search toggle's fill state mirrors the filter toggle's pattern exactly

`LibrarySearchControlsActions` (`library-search-controls-actions.tsx`) renders two `LibrarySearchActionButton`s — filter and search — sharing the same `isFilled` treatment (white background when true). The filter button already computes `isFilled={isFilterPopoverVisible || hasActiveFilters}`; the search button currently hardcodes `isFilled={true}`, so it always renders filled regardless of state.

Fix: change the search button to `isFilled={isSearchBarVisible}`. No OR-clause equivalent to `hasActiveFilters` is needed for search, because search has no "closed but still active" state today: `resolveHeaderSearchToggleOutcome` (`header-search-toggle-model.ts`) sets `shouldDeactivateSearch: true` any time `isSearchBarVisible` transitions from `true` to `false`, and the panel's `handleSearchActionPress` always calls `searchState.deactivateLibrarySearch()` when that flag is set — so `isSearchBarVisible` and "search is active" are always in lockstep for this button, unlike filters.

**Alternative considered:** give search a `hasActiveFilters`-equivalent OR-clause for symmetry with the filter button's exact shape. Rejected — it would be dead code today (the two states can never diverge), and would misleadingly suggest search supports a "closed but active" mode it doesn't have.

### Active-filter dot indicator on the filter toggle button

Add a small dot badge, absolutely positioned in a corner of `LibrarySearchActionButton`, rendered only when a new `hasActiveFilters` prop passed to `LibrarySearchControlsActions` is `true` — reusing the exact same `hasActiveFilters` boolean `library-header-search-props.ts` already computes (`entityFilter !== 'all' || selectedTagFilters.length > 0`), which is already threaded down to `SavedRehearsalLibraryHeader`/`LibrarySearchControlsActions` today. No new state; this only adds a visual layer keyed off state that already exists, plus threading that boolean into `LibrarySearchActionButton`'s new optional `showActiveIndicator` prop (used only by the filter button, not the search button).

The dot is a simple present/absent indicator, not a count — see the proposal's Non-Goals. This keeps `LibrarySearchActionButton` generic and avoids a counting-rule debate (does `Show` count as 1 toward a total alongside each tag, or not).

**Refinement during implementation (explicit user direction):** the filter button's `isFilled` no longer includes `hasActiveFilters` at all (it previously computed `isFilterPopoverVisible || hasActiveFilters`, predating this proposal). It now mirrors the search button exactly — `isFilled={isFilterPopoverVisible}`, open/closed only — because folding `hasActiveFilters` into the fill state made the popover's open/closed state harder to distinguish once the dot and chip already carry the active-filter signal. The dot and chip are now the only active-filter indicators; the fill state is purely about whether the popover is open.

### One combined "active filters" summary chip, rendered in the shared header area, global across views

Placement: the chip renders inside `LibrarySearchControls` (`library-search-controls.tsx`), in the same `panelContent` `View` that already conditionally renders `filterPopover` and `searchPanel` — but the chip renders whenever `hasActiveFilters` is true, **independent of `isFilterPopoverVisible`**, so it stays visible after the popover closes. This is the same component that already receives `entityFilter`/`selectedTagFilters` as props (via the filter-popover wiring), so no new prop plumbing is needed beyond passing `hasActiveFilters` through and reusing the existing `entityFilter`/`selectedTagFilters` props to compute the label.

**Implementation note — `hasActiveFilters` source for the chip vs. the dot:** the dot (header row) reuses `headerSearchProps.hasActiveFilters` exactly as planned, via the existing `search-shell.tsx`/`SavedRehearsalLibraryHeader` threading path. The chip (browse content) cannot reuse that same prop path unchanged: `SavedRehearsalLibrarySearchShell`/`LibrarySearchControls` are also rendered from a second `SavedRehearsalLibrarySection` embed (the Drive tab's saved-library panel) that has no header and no `headerSearchProps` at all, so adding `hasActiveFilters` as a new required prop on `SavedRehearsalLibrarySectionProps` broke that call site. Fixed by extracting the boolean formula into a shared `resolveHasActiveLibraryFilters(entityFilter, selectedTagFilters)` helper in `saved-library-search-view-model.ts`, used both by `library-header-search-props.ts` (for the header/dot path) and independently inside `saved-rehearsal-library-section/index.tsx` (for the chip), computed there from that section's own already-resolved `searchState` (external or internal). Both computations stay byte-for-byte identical in the common case; the only place they can diverge is the header's `detailSearchActions` override (tag-detail view registering its own header actions), which intentionally does not affect the chip, since the chip reflects the browse content's own filter state, not the header row's current target.

Scope: the chip (and the dot indicator) reflect `hasActiveFilters` globally, the same way that value is already computed today — not scoped to `selectedView === 'files'`. This is intentional and consistent with `library-views-sort-search-parity`'s entity-filter-reset fix, which treats `entityFilter`/`selectedTagFilters` as shared state that can silently affect any view; making that shared state's _presence_ visible everywhere it can take effect is the natural complement to that fix, not a scope narrowing.

Tap behavior: the chip calls the same `onFilterActionPress`/`handleFilterActionPress` already wired to the funnel icon — it is a second entry point into the same popover-open action, not a new interaction pattern.

**Alternative considered:** one chip per active filter (Show + each tag), each individually removable without opening the popover. Rejected per explicit confirmation — more UI surface and a new per-chip removal interaction, for a proposal whose goal is _visibility_ of existing state, not a new way to mutate it. If demand for inline removal shows up later, that is a natural, separately-scoped follow-up.

**Alternative considered:** scope the chip/indicator to Files only, since `Show` is Files-only UI. Rejected per explicit confirmation — `entityFilter`/`selectedTagFilters` already affect Tracks/Loops/Playlists/Tags today (that is exactly the bug `library-views-sort-search-parity` fixed for view-switching), so hiding the indicator outside Files would under-communicate real filtering happening elsewhere.

### Chip label formula

Given `entityFilter: 'all' | 'tracks' | 'loops' | 'playlists'` and `selectedTagFilters: string[]`, the label is built as:

- If `entityFilter !== 'all'`: start with that filter's display label (`Tracks`/`Loops`/`Playlists`, matching `ENTITY_FILTER_OPTIONS`'s existing labels).
- If `selectedTagFilters.length > 0`: append a pluralized tag count (`1 tag` / `N tags`), following the same `pluralize(count, noun)` pattern already used by `getPlaylistDetailLabel` (`saved-playlist-card-view-model.ts`).
- If both are present, join with the same `•` separator already used by `getSourceMetadataLabels`/`getPlaylistDetailLabel` for combining multiple label parts.
- If neither is active, the chip does not render (`hasActiveFilters` is `false`).

This keeps the label short and consistent with existing label-composition conventions elsewhere in this codebase, without inventing a new formatting scheme.

## Risks / Trade-offs

- [Recursive folder-match scanning costs O(children × fileLinks) per rendered folder level when a filter is active] → Acceptable: rehearsal libraries are small (tens to low hundreds of items), and the scan only runs when a non-default filter is selected, not on every render of the default (no-filter) case.
- [A folder that matches only via its own tags, with nothing matching inside it, opens into a listing that still shows all of its unfiltered-by-tag-match children] → Expected: opening a folder always re-runs the same filtering rules for that folder's own children; if none of them match, the user sees an empty-of-matches (but still filtered) listing at that level, which is consistent with how every other level in the tree behaves under an active filter.
- [The summary chip and dot indicator are global (`entityFilter`/`selectedTagFilters` state), so a filter set while in Files stays visibly indicated after switching to Tracks/Loops/Playlists/Tags, even in views with no `Show` UI of their own] → Acceptable, and intentional: this is the correct complement to `library-views-sort-search-parity`'s entity-filter-reset fix — that fix stops a stale Files-only filter from _silently_ suppressing results elsewhere; this proposal makes any filter that _is_ still active _visible_ everywhere it can take effect, rather than only where it was set.
- [A dot indicator alone is a subtle affordance and could still be missed] → Mitigated by pairing it with the always-visible (while active) summary chip in the browse content area itself, which is a much larger, harder-to-miss surface than an icon-corner dot.
