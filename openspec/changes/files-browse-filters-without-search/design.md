## Context

`Files`' browse pipeline (`packages/mobile-rehearsal-player/src/app/library/saved-rehearsal-library/library-files-model/index.ts`) branches on whether a search query is active:

- With an active query, `buildSearchRows` runs: it reads `entityFilter` and `selectedTagFilters` from `LibraryFilesSearchOptions`, applies them via the already-generic `matchesEntityFilter`/`matchesSelectedTags` helpers (`library/search/utils/saved-library-search-view-model.ts`), and — because search flattens matches from the whole scoped subtree (current-folder or all-files) into one list with `prefixContainingPath` location labels — folders are handled specially: a folder row appears only when `entityFilter === 'all'`, and even then only if the *folder's own* tags match.
- Without an active query, `buildDefaultRows` runs: it lists exactly the direct children (folders and file-linked entities) of `currentFolder`, one level at a time, drill-down style. It receives `sortMode`/`sortDirection` and applies them, but never receives `entityFilter` or `selectedTagFilters` at all — so `Show` and `Tags` selections are silently no-ops while just browsing.

This is the bug: a user who sets `Show: Tracks` or picks a tag while browsing (not searching) sees the exact same rows as with no filter active. The existing spec's "Filter by one or more tags" scenario already describes filtering "visible saved entities" without carving out an active-search precondition, so today's plain-browsing behavior doesn't match the spec's own intent.

## Goals / Non-Goals

**Goals:**

- Make `Show` (entity-type) and `Tags` filters take effect while plain-browsing a folder, using the same matching semantics (`matchesEntityFilter`, `matchesSelectedTags`) already proven in `buildSearchRows`, so filtered results are consistent whether or not a search is active.
- Preserve the existing one-level-at-a-time, drill-down browsing model — this is not a switch to search's flatten-everything-with-location-labels presentation. A filtered folder listing still shows exactly the current folder's direct children; only *which* children appear changes.
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

## Risks / Trade-offs

- [Recursive folder-match scanning costs O(children × fileLinks) per rendered folder level when a filter is active] → Acceptable: rehearsal libraries are small (tens to low hundreds of items), and the scan only runs when a non-default filter is selected, not on every render of the default (no-filter) case.
- [A folder that matches only via its own tags, with nothing matching inside it, opens into a listing that still shows all of its unfiltered-by-tag-match children] → Expected: opening a folder always re-runs the same filtering rules for that folder's own children; if none of them match, the user sees an empty-of-matches (but still filtered) listing at that level, which is consistent with how every other level in the tree behaves under an active filter.
