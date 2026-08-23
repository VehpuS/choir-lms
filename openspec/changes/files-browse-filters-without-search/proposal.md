## Why

Files' `Show` (entity type) and `Tags` filters, exposed in the header's filter popover, only take effect when there is an active search query. Plain browsing goes through `buildDefaultRows` (`packages/mobile-rehearsal-player/src/app/library/saved-rehearsal-library/library-files-model/build-default-rows.ts`), which never reads `entityFilter` or `selectedTagFilters` at all — only `Sort` (`sortMode`/`sortDirection`) is threaded through for plain browsing. Only `buildSearchRows` reads and applies `entityFilter`/`selectedTagFilters`. This is a mistaken implementation: the existing `mobile-library-organization` spec's "Filter by one or more tags" scenario already states the system filters "visible saved entities" generally, with no carve-out for search-only applicability, so today's Files browsing behavior does not match the spec's own intent. A user selecting `Show: Tracks` or a tag filter while just browsing a folder sees no effect at all, which reads as broken.

Once filters take effect outside of search, the existing header controls no longer give users enough signal about filter state. Two related gaps, found while reviewing the header controls this change touches:

- The header's search toggle button renders filled (white background) unconditionally, regardless of whether search is actually open — unlike the filter toggle button, which already varies its fill by active state (`isFilterPopoverVisible || hasActiveFilters`). This is visually inconsistent between the two controls that sit side by side.
- Closing the filter popover already leaves `entityFilter`/`selectedTagFilters` active under the hood (`toggleLibraryFilterVisibility` only flips visibility, never clears filter state) — but the only visible cue that a filter is still narrowing results is the funnel icon's subtle fill-color change. Now that filters also affect plain Files browsing (not just search), a user who closes the popover after setting `Show: Tracks` has very little signal that their folder listing is still being filtered, which reads as easy to miss or forget.

Both header-control gaps are addressed in the same change since they surfaced from work on the same header/filter-popover surface, and the second is a direct consequence of this proposal's own goal (filters mattering more, more of the time, means their state needs to stay visible).

## What Changes

- `Show` (entity-type) and `Tags` filters selected in the Files filter popover now also apply while plain-browsing a folder (no active search query required), not only when a search is running.
- When a `Show`/`Tags` filter is active during plain browsing, a folder row is hidden from the current listing unless it recursively contains at least one item matching the active filter(s) — mirroring how Files search's `All Files` scope already surfaces matches from anywhere in the tree. A folder that does contain a match stays visible and still opens normally; it is not itself required to match the filter.
- `Scope` (`This folder` / `All Files`) is unaffected by this change and remains a search-corpus concept only — it has no defined meaning outside of an active search and this proposal does not give it one.
- `Sort` is unaffected; it already applies during plain browsing today.
- The header's search toggle button's filled (white background) state now reflects only whether the search bar is currently open (`isSearchBarVisible`), matching the same active/inactive visual pattern the filter toggle button already uses, instead of always rendering filled.
- The header's filter toggle button gains a small active-filter dot indicator that stays visible whenever `Show`/`Tags` filters are non-default (`hasActiveFilters`), independent of whether the filter popover itself is open or closed.
- A single combined "active filters" chip appears in the shared search/filter header area — alongside the view switcher, above the browse content — whenever `hasActiveFilters` is true, across all five Library views (this mirrors the already-global scope of `entityFilter`/`selectedTagFilters` state, consistent with how the `library-views-sort-search-parity` change's entity-filter-reset fix treats that same state as shared across views). Tapping the chip opens the filter popover, the same action as tapping the funnel icon. The chip's label is a short summary of what's active (e.g. `Tracks`, `2 tags`, or `Tracks · 2 tags`), following this codebase's existing pluralize-and-join label conventions (e.g. `getPlaylistDetailLabel`).

### Non-Goals

- No change to `Scope`'s behavior or applicability — it stays search-only.
- No change to how `Show`/`Tags` filters behave *during* an active search (`buildSearchRows`); this only extends the same filter values to also apply when there is no active search.
- No new filter types or filter UI — this only fixes when the two existing filters (`Show`, `Tags`) take effect.
- No per-filter individual clear affordance on the summary chip or the funnel-icon indicator — tapping either opens the filter popover, where individual filters are already cleared today; this proposal does not add a new removal interaction outside the popover.
- No numeric count on the funnel-icon indicator — it is a simple present/absent dot, not a count badge (the summary chip's text label already carries more detail for users who want it).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mobile-library-organization`: the "App-owned library search is available as a dedicated search function" requirement gains a scenario clarifying that `Show`/`Tags` filtering applies to plain Files browsing (not only active search), including the recursive folder-visibility rule, plus scenarios covering the active-filter indicator/summary chip staying visible after the filter popover closes and the search toggle's active-state fill parity; the "Filter by one or more tags" scenario under "Library entities support tag-based organization" is clarified to explicitly cover plain browsing, since today's implementation silently ignores it there.

## Impact

- **Code**: `packages/mobile-rehearsal-player/src/app/library/saved-rehearsal-library/library-files-model/build-default-rows.ts` gains entity-type and tag filtering plus recursive folder-match visibility; `library-files-model/index.ts` threads `entityFilter`/`selectedTagFilters` into the `buildDefaultRows` call alongside the existing sort options; likely a new colocated helper for the recursive "folder contains a match" check, probably shared with or adapted from equivalent logic already used by Files search's `All Files` scope location-awareness.
- **Code (header controls)**: `packages/mobile-rehearsal-player/src/app/library/search/components/library-search-controls-actions.tsx` gains the search button's `isFilled={isSearchBarVisible}` fix and a small dot-indicator overlay on the filter button, driven by a new `hasActiveFilters` prop already computed today in `library-header-search-props.ts`; `packages/mobile-rehearsal-player/src/app/library/search/components/library-search-controls.tsx` (or a small new colocated component) gains the always-visible (when active) summary chip, plus a new colocated helper to format its label from `entityFilter`/`selectedTagFilters`.
- **No backend/API changes**: presentation-layer filtering over already-loaded local state, same as existing search-mode filtering.
- **Depends on**: nothing blocking — reuses the existing `entityFilter`/`selectedTagFilters` state and matching helpers (`matchesEntityFilter`, tag-matching logic) already used by `buildSearchRows`; the header-control changes reuse the already-computed `hasActiveFilters` from `library-header-search-props.ts`.
