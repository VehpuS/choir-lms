## Context

Library's view-switcher has five views: Files, Tracks, Loops, Playlists, Tags. Sort coverage today is uneven:

- **Files** has a full sort control (`Name`/`Type`/`Date added`/`Date opened`) behind the header's filter-popover (funnel icon), defined in `library/search/components/library-search-filter-groups.tsx`'s `FILES_SORT_OPTIONS` and applied by `library-files-model/sort.ts`'s `sortRows`.
- **Tags** (built in `recents-tag-integration`, not yet archived) has its own inline sort control directly in `SavedTagsList` — two `InteractionChip`s for the field (`Name`/`Count`) plus a `SurfaceIconButton` that toggles ascending/descending, backed by `sortSavedTagUsage` in `library/tags/components/saved-tags-list/model.ts`.
- **Tracks, Loops, Playlists** have no sort control anywhere. Their filter popover is hidden entirely (`canShowFilters={isShowingFilesView}` in `screens/library/index.tsx`), so there is no UI surface for sort even if one existed. Rows render in whatever order `AsyncStoragePracticeRepository` persisted them (`sortBy([...], ['name'])` on every save — alphabetical ascending, non-locale-aware, and not something the user chose).

Search, by contrast, already works uniformly: `useSavedRehearsalLibrarySearch` filters `visibleSavedLibrarySources`/`visibleSavedLoops`/`visiblePlaylistCards` from `activeLibrarySearchQuery` regardless of `selectedView`, and each view already renders its own filtered list. This change is therefore scoped to sort, plus one small correctness fix (entity-filter reset) surfaced while auditing search.

## Goals / Non-Goals

**Goals:**

- Give Tracks, Loops, and Playlists the same kind of user-controlled sort Tags already has, using the same interaction pattern (field chips + direction toggle) rather than inventing a third UI convention.
- Extract the sort-controls UI Tags built into a shared, reusable presentational component so Tags/Tracks/Loops/Playlists all render literally the same widget, instead of four near-identical copies.
- Keep each view's sort semantics (which fields are sortable, what they mean) local to that view, since `Name`/`Count`/`Date added` mean different things per entity type.
- Fix the stale `entityFilter` correctness gap so switching views after a Files-scoped filter selection doesn't silently suppress results elsewhere.

**Non-Goals:**

- Not touching Files' own sort mechanism (options, filter-popover placement, `Type`/`Date opened` modes) — it already works and is scoped differently (grouped folders-first, more fields, persisted/restorable session state).
- Not persisting the new Tracks/Loops/Playlists sort selection across remounts or app restarts. Tags doesn't persist its sort either; matching that keeps behavior predictable and avoids a new persistence surface for this pass.
- Not adding new sortable fields beyond `Name` and `Date added` — no `Type` (each of these views is already single-entity-type, unlike Files) and no per-view exotic fields (e.g. playlist item count) unless a follow-up specifically asks for them.

## Decisions

### Extract Tags' inline sort-row UI into a shared, reusable component

Tags' current sort row (`SavedTagsList`, two `InteractionChip`s + a `SurfaceIconButton` direction toggle, driven by a local `{ field, direction }` state) is already generic in shape — it doesn't know anything about tags specifically beyond its field option labels. Extract it into a new shared component, e.g. `SortFieldChipRow` in `library/components/` (cross-feature, following the same convention as the existing `FilterChipGroup<Value>` generic component), parameterized by:

```ts
type SortFieldChipRowProps<Field extends string> = {
  directionToggleAccessibilityLabel: string;
  direction: 'asc' | 'desc';
  fieldOptions: { label: string; value: Field }[];
  onSelectField: (field: Field) => void;
  onToggleDirection: () => void;
  selectedField: Field;
};
```

Tags, Tracks, Loops, and Playlists each keep their own `{ field, direction }` state and comparator (`sortSaved<Entity>By(...)`) in their own local `model.ts`/view-model, but all render the same `SortFieldChipRow`. This is a small refactor of already-shipped Tags code, done as its own early task in this change, so Tags doesn't end up as a permanently-diverging one-off.

**Alternative considered:** leave Tags' sort row as bespoke JSX and copy-paste the pattern into Tracks/Loops/Playlists. Rejected — three more near-identical copies of the same chip-row-plus-toggle markup is exactly the kind of duplication the repo's coding-style policy asks to avoid, and any future visual tweak (e.g. spacing, accessibility label wording) would need four synchronized edits instead of one.

### Sort control placement: inline in each view, not the Files filter-popover

Mirror Tags exactly: render the sort row inline at the top of each view's own content (Tracks/Loops/Playlists), not behind the header's funnel icon the way Files' sort is. This matches the proposal's explicit direction ("the same features implemented for tags") and avoids introducing a second, hidden way to reach sort for these three views when they currently have no filter-popover trigger at all.

**Alternative considered:** extend `canShowFilters`/the filter popover to also appear for Tracks/Loops/Playlists, adding a `Sort` `FilterChipGroup` there (mirroring Files' own mechanism instead of Tags'). Rejected — this would mean two different sort UI conventions live in Library at once (Files' hidden popover vs. Tags' inline row) instead of Tracks/Loops/Playlists converging on the newer, already-visible pattern; it would also modify the existing spec'd scenario "`Show` filter section appears only when the active Library view is Files" in a way not requested here (that scenario governs `Show`, not `Sort`, but conflating the two mechanisms revives the same "hidden filter surface" trade-off `recents-tag-integration`'s design.md already rejected for Tags).

### `Date added` field mapping matches Files' existing semantics

For consistency, `Date added` means the same underlying field Files' own `Date added` sort already uses per entity type: `source.modifiedTime` for tracks, `loop.createdAt` for loops, `playlist.createdAt` for playlists (see `library-files-model/sort.ts`'s `resolveRowDateAddedTimestamp`). Newest-first when `desc` (the default direction for this field, mirroring Files), oldest-first when `asc`.

**Open question below:** whether to expose both directions for `Date added` (like Tags does for both its fields) or fix it newest-first only (like Files does for its Date modes) - default to both-directions-toggleable for simplicity and consistency with the shared `SortFieldChipRow`'s single toggle affordance, but confirm during implementation if a fixed-direction date sort reads as more natural once built.

### Entity-filter reset happens on view change, not on every render

Add a reset in the existing view-switch handler path (`setSelectedView` call site or a small effect alongside `useSavedRehearsalLibrarySearch`) that clears `entityFilter` back to `'all'` whenever `selectedView` changes and no search is currently active-`isLibrarySearchMode` is false. Scoping the reset to "no active search" avoids yanking a filter out from under a user who is mid-search and taps between the (already search-visible) Tracks/Loops/Playlists results.

**Alternative considered:** reset `entityFilter` unconditionally on every view change, including mid-search. Rejected - would silently discard an intentional filter choice while the user is actively looking at filtered search results, which is more surprising than the bug it fixes.

## Risks / Trade-offs

- [Extracting `SortFieldChipRow` touches already-shipped, working Tags code] → Low risk: purely a presentational extraction with no behavior change, covered by re-running Tags' existing manual verification steps after the refactor, before adding any new view's sort on top of it.
- [Four views' worth of sort state, none persisted] → Acceptable per Non-Goals; if user feedback after shipping asks for persistence, that's a separate, small follow-up (mirroring however Files' `filesSortMode` persistence/restoration is later extended, if ever).
- [`Date added` semantics could read as unintuitive if toggeable both ways when Files fixes it one way] → Flagged as an open question above; cheap to change the default/toggleability during implementation once it's on screen.

## Open Questions

- Should `Date added` be ascending/descending toggleable (matching Tags' both-fields-toggleable model) or fixed newest-first (matching Files' Date modes)? Default to toggleable; confirm once built.
- Exact accessibility-label wording for the shared `SortFieldChipRow`'s direction toggle across four different entity vocabularies (e.g. "Sort tracks ascending" vs. a generic "Sort ascending") - default to the generic wording `getSavedTagsListSortDirectionToggleLabel` already uses today, confirm no accessibility-review concern once implemented.
