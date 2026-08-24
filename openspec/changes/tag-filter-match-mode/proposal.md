## Why

Today's `Tags` filter always requires an entity to have _every_ selected tag (AND-only matching, enforced by `matchesSelectedTags`). Selecting two tags to broaden a search (e.g. "show me anything tagged Alto _or_ Warmup") is not possible — adding a second tag only ever narrows results further. This is a common, well-understood filtering need with established mobile precedent (e.g. Reminders/Shortcuts smart-list rule groups expose a single "Match: All / Any" toggle over a set of conditions), and users organizing a growing tag vocabulary will hit this limitation as soon as they select more than one tag expecting broader results.

## What Changes

- The `Tags` filter gains an explicit match-mode toggle — `All` (current AND behavior) or `Any` (OR: an entity matches if it has at least one selected tag) — rendered inline with the existing `TAGS` filter-group label, mirroring the same trailing-toggle pattern already used for the `Sort` group's ascending/descending direction toggle.
- The match mode is a single, global setting (not per-tag, not per-view) alongside the already-shared `selectedTagFilters` state, consistent with how that state is already shared globally across Library views.
- Default match mode is `All`, so existing tag-filter behavior is unchanged until a user explicitly switches to `Any` — no behavior change for anyone who doesn't touch the new toggle.
- The active-filters summary chip (from `files-browse-filters-without-search`) reflects the mode only when it deviates from the default: `2 tags` stays as-is under `All`, but reads `2 tags (any)` under `Any`.
- Applies everywhere `Tags` filtering already applies today: Files plain browsing, Files search, and the Tracks/Loops/Playlists/Tags views — since match mode is a property of the same shared filter state those already read.

### Non-Goals

- No per-tag or per-condition operator (unlike Notion's arbitrarily-nestable AND/OR condition groups) — one global mode for the whole `selectedTagFilters` set, matching the simpler Reminders/Shortcuts precedent this proposal follows.
- No change to how the `Show` entity-type filter combines with `Tags` — that combination stays an implicit AND (an entity must match both the type filter and the tag filter under whichever tag mode is active), unaffected by this proposal.
- No new tag-selection UI beyond the mode toggle — tag chips themselves keep their existing toggle-to-select interaction.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `mobile-library-organization`: the "Filter by one or more tags" scenario gains match-mode semantics (`All` vs `Any`), including the new toggle control and its default, plus a scenario covering how the active-filters summary chip's label reflects a non-default mode.

## Impact

- **Code**: `matchesSelectedTags` (`packages/mobile-rehearsal-player/src/app/library/search/utils/saved-library-search-view-model.ts`) gains a match-mode parameter — this is the single shared matcher already used by Files plain browsing, Files search, and the Tracks/Loops/Playlists filter helpers, so the change is centralized there.
- **Code (state)**: `useSavedRehearsalLibrarySearch` gains a new `tagFilterMatchMode` piece of state (default `'all'`) alongside the existing `selectedTagFilters`, threaded the same way that state already flows to `LibraryFilesSearchOptions` and the filter popover.
- **Code (UI)**: `library-search-filter-popover.tsx` gains a toggle control in the `TAGS` group header; `library-search-active-filters-model.ts`'s `resolveActiveFiltersSummaryLabel` gains the `(any)` suffix logic.
- **No backend/API changes**: presentation-layer filtering over already-loaded local state, same as the filters it extends.
- **Depends on**: `files-browse-filters-without-search` (archived) — this proposal extends the same shared `entityFilter`/`selectedTagFilters` filter state and the active-filters summary chip that change introduced.
