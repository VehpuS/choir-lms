## Context

Tag filtering is centralized in one query-agnostic matcher, `matchesSelectedTags` (`packages/mobile-rehearsal-player/src/app/library/search/utils/saved-library-search-view-model.ts`):

```ts
export const matchesSelectedTags = (options: {
  selectedTags: string[];
  tags: string[] | undefined;
}) => {
  if (options.selectedTags.length === 0) return true;
  if (!options.tags || options.tags.length === 0) return false;
  const entityTags = new Set(options.tags.map(normalizeTagToken));
  return options.selectedTags.every((tag) => entityTags.has(tag));
};
```

`.every(...)` means an entity must carry _all_ selected tags — pure AND. This function has exactly four call sites, all inside `library-files-model`/`search/utils`, and everything else (Tracks/Loops/Playlists filtering via `filterSavedLibrarySourcesByQuery`/`filterSavedLoopsByQuery`/`filterSavedPlaylistsByQuery`) goes through it transitively — so it is the single source of truth for tag matching across every Library view. `selectedTagFilters` itself is state owned by `useSavedRehearsalLibrarySearch` (`use-saved-rehearsal-library-search.ts`) and is explicitly _not_ reset on view change (unlike `entityFilter`, per `resolveEntityFilterOnViewChange`), following the `library-views-sort-search-parity` precedent that tag selection is shared, global state.

The just-archived `files-browse-filters-without-search` change added a `hasActiveFilters`-driven summary chip (`resolveActiveFiltersSummaryLabel` in `library-search-active-filters-model.ts`) and a dot indicator, both driven by `entityFilter`/`selectedTagFilters`. This proposal's match-mode setting needs to feed the same label formula.

## Goals / Non-Goals

**Goals:**

- Let a user choose, for the current set of selected tags, whether an entity must match _all_ of them or _any_ of them.
- Apply that choice uniformly everywhere `selectedTagFilters` already applies (Files browsing, Files search, Tracks/Loops/Playlists/Tags views) by changing the one shared matcher, not per-surface logic.
- Default to `All` so existing behavior (and existing tests) are unchanged until a user opts into `Any`.
- Reflect a non-default mode in the existing active-filters summary chip.

**Non-Goals:**

- No per-tag or per-condition operators (Notion-style nested AND/OR groups) — one mode for the whole `selectedTagFilters` set.
- No change to how `Show` (entity type) combines with `Tags` — still an implicit AND between the two facets, independent of the tag mode.
- No persistence of match mode across app restarts beyond however `selectedTagFilters` itself is (or isn't) already persisted — this proposal does not change that persistence boundary.

## Decisions

### One global `tagFilterMatchMode: 'all' | 'any'`, colocated with `selectedTagFilters`

Add `tagFilterMatchMode` as a new piece of state in `useSavedRehearsalLibrarySearch`, alongside `selectedTagFilters`, defaulting to `'all'`. It is reset by `clearLibrarySearch()` the same way `selectedTagFilters` already is, and — like `selectedTagFilters` — it is _not_ reset by the view-change effect that resets `entityFilter`, since tag selection (and now its mode) is established shared, cross-view state.

**Alternative considered:** scope match mode per-view or per-tag. Rejected — the proposal's own precedent (Reminders/Shortcuts "Match: All/Any" over one rule group) is a single mode for one set of conditions; per-view or per-tag modes would reintroduce the kind of hidden, surface-specific filter state that `library-views-sort-search-parity` deliberately eliminated for `entityFilter`/`selectedTagFilters`.

### `matchesSelectedTags` gains a `matchMode` parameter; every call site threads it through explicitly

```ts
export const matchesSelectedTags = (options: {
  matchMode: TagFilterMatchMode; // 'all' | 'any'
  selectedTags: string[];
  tags: string[] | undefined;
}) => {
  if (options.selectedTags.length === 0) return true;
  if (!options.tags || options.tags.length === 0) return false;
  const entityTags = new Set(options.tags.map(normalizeTagToken));
  return options.matchMode === 'any'
    ? options.selectedTags.some((tag) => entityTags.has(tag))
    : options.selectedTags.every((tag) => entityTags.has(tag));
};
```

No default value on `matchMode` — every one of the four call sites (`build-default-rows.ts`, `build-search-rows.ts`, `folder-contains-matching-entity.ts`, and the `filterSaved*ByQuery` helpers in `saved-library-search-view-model.ts` itself) is updated in the same change to pass the caller's resolved `tagFilterMatchMode`, so there is no silent fallback that could mask an un-migrated call site.

**Alternative considered:** default `matchMode` to `'all'` so existing call sites keep compiling unchanged. Rejected — an optional parameter with a silent default is exactly how a future call site could forget to thread the new state through and silently ignore a user's `Any` selection; requiring every caller to pass it explicitly makes that impossible to miss at compile time.

### Toggle control: a compact pill in the `TAGS` group header, reusing `InteractionChip`

Add a small trailing toggle to the existing `TAGS` group block in `library-search-filter-popover.tsx` (currently a bare `Text` label + wrapped tag chips), giving that block the same `filterLabelRow` (label + trailing control) shape `FilterChipGroup` already uses for `Sort`'s ascending/descending toggle. The control itself is a single `InteractionChip` reading `Match: All` / `Match: Any`, flipping mode on tap — reusing the existing chip component rather than introducing a new control, the same way the Sort direction toggle reuses `SurfaceIconButton` rather than inventing a bespoke control.

**Alternative considered:** an icon-only toggle mirroring `SurfaceIconButton`'s sort-direction arrows exactly. Rejected — there is no widely-recognized icon pair for "match all" vs "match any" the way ascending/descending arrows are self-explanatory; a short text label is clearer here and costs no more space than the existing tag chips it sits beside.

### Active-filters summary chip label: append `(any)` only when mode is `Any`

`resolveActiveFiltersSummaryLabel` gains a `tagFilterMatchMode` parameter. The tag-count segment (`1 tag` / `N tags`) gets a ` (any)` suffix only when `tagFilterMatchMode === 'any'` and at least one tag is selected; under the default `All` mode the label is byte-for-byte unchanged from today (`2 tags`, not `2 tags (all)`), matching the confirmed decision to only surface the non-default choice.

**Alternative considered:** always show the mode explicitly (`2 tags (all)` / `2 tags (any)`). Rejected per explicit confirmation — clutters the common (default) case for a distinction most users will never change away from.

## Risks / Trade-offs

- [Every `matchesSelectedTags` call site must be touched in the same change, since the parameter has no default] → Acceptable and intentional: the call-site count is small (4, all within one model/util area), and this is the same "single source of truth, thread explicitly" approach `files-browse-filters-without-search` already used successfully for `entityFilter`/`selectedTagFilters` in `build-default-rows.ts`.
- [A user could select `Any`, broaden results, forget the mode is active, and be confused why unrelated items appear] → Mitigated the same way `files-browse-filters-without-search` mitigates stale-filter confusion generally: the active-filters chip surfaces `(any)` whenever it's non-default, and the existing dot indicator already signals _some_ filter is active regardless of mode.
- [Global (not per-view) match mode means switching to `Any` in Files also broadens results in Tracks/Loops/Playlists/Tags] → Expected and consistent: `selectedTagFilters` itself is already global across views per `library-views-sort-search-parity`; match mode is a property of that same shared selection, not a new scoping concern.
