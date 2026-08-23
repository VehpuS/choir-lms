## Context

Library's view-switcher has five views: Files, Tracks, Loops, Playlists, Tags. Sort coverage today is uneven:

- **Files** has a full sort control (`Name`/`Type`/`Date added`/`Date opened`) behind the header's filter-popover (funnel icon), defined in `library/search/components/library-search-filter-groups.tsx`'s `FILES_SORT_OPTIONS` and applied by `library-files-model/sort.ts`'s `sortRows`.
- **Tags** (built in `recents-tag-integration`, now archived) sort is **also** behind that same filter-popover mechanism, not an inline row: `library-search-controls.tsx`'s `filterPopover` renders a `Sort` `FilterChipGroup` (`Name`/`Count`) plus a `SurfaceIconButton` ascending/descending toggle when `selectedView === 'tags'`, gated by `canShowFilterPopover: selectedView === 'files' || selectedView === 'tags'` in `screens/library/library-header-search-props.ts`. `SavedTagsList` itself renders no sort UI at all — it only consumes the resulting `SavedTagsListSortState` to order rows. A second, independent instance of the identical `FilterChipGroup` + `SurfaceIconButton` pattern already exists for the tag-detail screen's own sort (`tags/components/tag-match-list/controls-panel.tsx`), also gated behind that screen's own filter-popover toggle. **Correction from an earlier draft of this document:** there is no existing "inline, always-visible" sort row anywhere in the app to mirror — every sort control in the codebase today is hidden behind a filter-popover-style toggle. `library-search-filter-groups.tsx`'s `FilterChipGroup<Value>` is already the generic, reusable component this pattern is built on; nothing bespoke needs to be "extracted" out of `SavedTagsList`.
- **Tracks, Loops, Playlists** have no sort control anywhere. Their filter popover is hidden entirely (`canShowFilterPopover` is `false` for these three views), so there is no UI surface for sort even if one existed. Rows render in whatever order `AsyncStoragePracticeRepository` persisted them (`sortBy([...], ['name'])` on every save — alphabetical ascending, non-locale-aware, and not something the user chose).

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

### Sort control placement: reuse the existing filter-popover mechanism, not a new inline row

**Corrected after implementation review (confirmed with user):** an earlier draft of this document assumed Tags already had an always-visible inline sort row, and planned to extract it and move all four views (Tags/Tracks/Loops/Playlists) onto that new inline pattern, away from Files' "hidden" popover. That assumption was wrong — Tags' sort (and the tag-detail screen's separate sort) already live behind the same filter-popover funnel-icon toggle Files uses, via the existing generic `FilterChipGroup<Value>` component. There is no inline convention anywhere in the app to converge on, and building one now would mean inventing a brand-new, unprecedented placement and moving Tags' already-shipped, working sort UI to it for no functional reason.

Instead: extend `canShowFilterPopover` (`screens/library/library-header-search-props.ts`) to also return `true` for the Tracks, Loops, and Playlists views (alongside Files and Tags — these five are the complete `SavedRehearsalLibraryView` set, so this branch becomes unconditionally `true` when not in a detail view), and add a `Sort`-only `FilterChipGroup` block to `library-search-controls.tsx`'s `filterPopover` for each of the three new views, following the exact shape of the existing Tags block (no `Scope`/`Show` groups, since those are Files-specific and out of scope here). This is the smallest possible diff, touches no already-shipped Tags behavior, and does not introduce a second UI convention — it is the same one every other sort control in the app already uses.

### Extract a shared `SortFieldChipRow` to stop duplicating the `FilterChipGroup` + direction-toggle pairing

`FilterChipGroup<Value>` is already generic, but every one of its three current sort call sites (Files, Tags, tag-detail) separately re-composes the same `trailingAction={<SurfaceIconButton accessibilityLabel={...} icon={direction === 'asc' ? 'sort-ascending' : 'sort-descending'} onPress={...} size={16} style={...} />}` wiring and re-declares an identical set of `filterChip`/`filterGroup`/`filterLabelRow`/`filterLabel`/`filterRow`/`sortDirectionToggle` style objects in each file's own `StyleSheet.create`. Adding three more call sites (Tracks/Loops/Playlists) without factoring this out would make `library-search-controls.tsx` both very repetitive and push it over the repo's 300-line file guidance.

Extract a `SortFieldChipRow` component into `library/components/` (cross-feature, since it will be used by `library/search/`, `library/tags/`, and the three new view surfaces), wrapping `FilterChipGroup` + the direction-toggle `SurfaceIconButton` and owning its own default styles (matching the values already duplicated today) so callers only pass the sort-specific data:

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

Refactor the two existing Tags-related call sites (`library-search-controls.tsx`'s Tags `Sort` block and `tag-match-list/controls-panel.tsx`'s `Sort` block) onto this component to prove it generalizes, then use it for the three new Tracks/Loops/Playlists blocks. **Files' own `Sort` block is left untouched**, per this change's explicit non-goal of not touching Files' sort mechanism or filter-popover UI — refactoring it is not required for Tracks/Loops/Playlists to gain sort, and doing so anyway would risk an already-working, non-goal-protected surface for zero functional benefit.

Tags, Tracks, Loops, and Playlists each keep their own `{ field, direction }` state and comparator (`sortSaved<Entity>By(...)`) in their own local `model.ts`/view-model; only the presentational chip-row-plus-toggle widget is shared.

**Alternative considered:** leave every sort call site as independently-composed `FilterChipGroup` + `SurfaceIconButton` JSX and add three more that way. Rejected — six near-identical copies (three existing plus three new) of the same wiring and style objects is exactly the kind of duplication the repo's coding-style policy asks to avoid, and it would push `library-search-controls.tsx` past the file-length guidance once three more blocks are inlined into it.

### `Date added` field mapping matches Files' existing semantics

For consistency, `Date added` means the same underlying field Files' own `Date added` sort already uses per entity type: `source.modifiedTime` for tracks, `loop.createdAt` for loops, `playlist.createdAt` for playlists (see `library-files-model/sort.ts`'s `resolveRowDateAddedTimestamp`). Newest-first when `desc` (the default direction for this field, mirroring Files), oldest-first when `asc`.

**Open question below:** whether to expose both directions for `Date added` (like Tags does for both its fields) or fix it newest-first only (like Files does for its Date modes) - default to both-directions-toggleable for simplicity and consistency with the shared `SortFieldChipRow`'s single toggle affordance, but confirm during implementation if a fixed-direction date sort reads as more natural once built.

### Entity-filter reset happens on view change, not on every render

Add a reset in the existing view-switch handler path (`setSelectedView` call site or a small effect alongside `useSavedRehearsalLibrarySearch`) that clears `entityFilter` back to `'all'` whenever `selectedView` changes and no search is currently active-`isLibrarySearchMode` is false. Scoping the reset to "no active search" avoids yanking a filter out from under a user who is mid-search and taps between the (already search-visible) Tracks/Loops/Playlists results.

**Alternative considered:** reset `entityFilter` unconditionally on every view change, including mid-search. Rejected - would silently discard an intentional filter choice while the user is actively looking at filtered search results, which is more surprising than the bug it fixes.

## Risks / Trade-offs

- [Refactoring the two existing Tags-related `Sort` blocks onto `SortFieldChipRow` touches already-shipped, working code] → Low risk: purely a presentational extraction with no behavior change, covered by re-running Tags' and the tag-detail screen's existing manual verification steps after the refactor, before adding any new view's sort on top of it.
- [Four views' worth of sort state, none persisted] → Acceptable per Non-Goals; if user feedback after shipping asks for persistence, that's a separate, small follow-up (mirroring however Files' `filesSortMode` persistence/restoration is later extended, if ever).
- [`Date added` semantics could read as unintuitive if toggeable both ways when Files fixes it one way] → Flagged as an open question above; cheap to change the default/toggleability during implementation once it's on screen.

## Open Questions

- Should `Date added` be ascending/descending toggleable (matching Tags' both-fields-toggleable model) or fixed newest-first (matching Files' Date modes)? Default to toggleable; confirm once built.
- Exact accessibility-label wording for the shared `SortFieldChipRow`'s direction toggle across four different entity vocabularies (e.g. "Sort tracks ascending" vs. a generic "Sort ascending") - default to the generic wording `getSavedTagsListSortDirectionToggleLabel` already uses today, confirm no accessibility-review concern once implemented.
