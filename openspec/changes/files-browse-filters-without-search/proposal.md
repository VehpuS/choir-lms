## Why

Files' `Show` (entity type) and `Tags` filters, exposed in the header's filter popover, only take effect when there is an active search query. Plain browsing goes through `buildDefaultRows` (`packages/mobile-rehearsal-player/src/app/library/saved-rehearsal-library/library-files-model/build-default-rows.ts`), which never reads `entityFilter` or `selectedTagFilters` at all — only `Sort` (`sortMode`/`sortDirection`) is threaded through for plain browsing. Only `buildSearchRows` reads and applies `entityFilter`/`selectedTagFilters`. This is a mistaken implementation: the existing `mobile-library-organization` spec's "Filter by one or more tags" scenario already states the system filters "visible saved entities" generally, with no carve-out for search-only applicability, so today's Files browsing behavior does not match the spec's own intent. A user selecting `Show: Tracks` or a tag filter while just browsing a folder sees no effect at all, which reads as broken.

## What Changes

- `Show` (entity-type) and `Tags` filters selected in the Files filter popover now also apply while plain-browsing a folder (no active search query required), not only when a search is running.
- When a `Show`/`Tags` filter is active during plain browsing, a folder row is hidden from the current listing unless it recursively contains at least one item matching the active filter(s) — mirroring how Files search's `All Files` scope already surfaces matches from anywhere in the tree. A folder that does contain a match stays visible and still opens normally; it is not itself required to match the filter.
- `Scope` (`This folder` / `All Files`) is unaffected by this change and remains a search-corpus concept only — it has no defined meaning outside of an active search and this proposal does not give it one.
- `Sort` is unaffected; it already applies during plain browsing today.

### Non-Goals

- No change to `Scope`'s behavior or applicability — it stays search-only.
- No change to how `Show`/`Tags` filters behave *during* an active search (`buildSearchRows`); this only extends the same filter values to also apply when there is no active search.
- No new filter types or filter UI — this only fixes when the two existing filters (`Show`, `Tags`) take effect.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mobile-library-organization`: the "App-owned library search is available as a dedicated search function" requirement gains a scenario clarifying that `Show`/`Tags` filtering applies to plain Files browsing (not only active search), including the recursive folder-visibility rule; the "Filter by one or more tags" scenario under "Library entities support tag-based organization" is clarified to explicitly cover plain browsing, since today's implementation silently ignores it there.

## Impact

- **Code**: `packages/mobile-rehearsal-player/src/app/library/saved-rehearsal-library/library-files-model/build-default-rows.ts` gains entity-type and tag filtering plus recursive folder-match visibility; `library-files-model/index.ts` threads `entityFilter`/`selectedTagFilters` into the `buildDefaultRows` call alongside the existing sort options; likely a new colocated helper for the recursive "folder contains a match" check, probably shared with or adapted from equivalent logic already used by Files search's `All Files` scope location-awareness.
- **No backend/API changes**: presentation-layer filtering over already-loaded local state, same as existing search-mode filtering.
- **Depends on**: nothing blocking — reuses the existing `entityFilter`/`selectedTagFilters` state and matching helpers (`matchesEntityFilter`, tag-matching logic) already used by `buildSearchRows`.
