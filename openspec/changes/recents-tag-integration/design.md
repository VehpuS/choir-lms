## Context

Recents currently renders a "Popular shortcuts" module (`packages/mobile-rehearsal-player/src/app/screens/recents/index.tsx`) backed by a hardcoded `RECENTS_SHORTCUT_TAGS = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Warmup']` array. Tapping a chip calls `onPlayRecentShortcut(tag)`, but the wired handler in `app-router-recents-screen.tsx` ignores the tag entirely and just resumes the most recent rehearsal item — the shortcut tag was never connected to anything. `streamline-mobile-rehearsal-ux`'s design.md always described this module as "optional quick shortcuts (for example popular tags)," so this was a known placeholder from the start.

Separately, that same change introduced a real per-entity tag system: `tags?: string[]` on tracks (`Source`), loops (`NamedLoop`), playlists (`Playlist`), and folders (`FolderNode`) in `@org/audio-library-models`, a shared tag editor (`tag-editor-sheet`) with normalization (`normalizeLibraryEntityTags` — trims, collapses whitespace, case-insensitively dedupes per entity), and tag-based filtering already wired into Library's Files search/filter controls. There is currently no library-wide "list of tags in use" query and no UI that browses or plays by tag.

The queue system already supports building a playback queue from an arbitrary in-memory list without a saved `Playlist` entity: `createTransientPlaybackSession` (`playlist-playback-queue-state.ts`) builds a `PlaylistPlaybackSession` from a single seed `PlayableItem`, and the rest of the queue machinery (advance/rewind/repeat/Up Next UI) operates on that session type regardless of whether it originated from a saved playlist or a transient one. It currently only seeds with one item at a time (used for `Play next`/`Add to queue` promotion, task `4.2.7`).

## Goals / Non-Goals

**Goals:**

- Replace the static shortcut chips with a real, derived list of tags in use across the saved library.
- Let a user open a tag and see everything tagged with it, filter that list, and queue exactly what's visible.
- Reuse the existing queue/session machinery so tag playback gets Up Next, transport, and repeat-mode support for free.
- Keep folder- and playlist-tag matches meaningful for both browsing (show the folder/playlist as itself) and playback (expand to their contained tracks/loops).

**Non-Goals:**

- No new tag-authoring UI — creating/removing tags on entities continues through the existing tag editor; this change only adds a way to browse and play by the tags that already exist.
- No tag hierarchy, tag colors, tag descriptions, or any tag metadata beyond the existing plain string.
- No changes to how folder or playlist contents are browsed in Files/Playlists themselves — only how they're resolved when queued from a tag.
- Not responsible for fixing the defects tracked in `streamline-mobile-rehearsal-ux`'s `2.9` follow-up tasks (e.g. the `Alert.alert` web no-op); this change should land after those land, since it adds more surface area that depends on working removal/tag-editor flows.

## Decisions

### Tag aggregation is computed, not stored

Compute the set of in-use tags on demand by scanning `tags` across saved tracks, loops, playlists, and folders, using the existing `normalizeLibraryEntityTags` dedupe rule (case-insensitive, first-seen casing wins) so the aggregation matches what the tag editor already considers "the same tag." No new persisted "tags" collection — this keeps a single source of truth (the entities' own `tags` fields) and avoids a sync problem between a cached tag list and per-entity edits.

**Alternative considered:** a dedicated `Tag` entity with its own id, persisted separately and referenced by id from tracks/loops/playlists/folders. Rejected for this change as a bigger data-model migration than the requested feature needs; the existing free-text-tag model works for aggregation as long as normalization is consistent, and it avoids a schema/storage migration for `streamline-mobile-rehearsal-ux`-era saved libraries.

### Recents shows a capped, most-used-first tag list; a "see all" path opens a dedicated Library Tags view

Cap the Recents module to 6 tags (confirmed with user, matching the current chip module's compactness goal from design.md's Recents section), ordered by how many entities carry each tag (most-used first, alphabetical tiebreak). If more tags exist than the cap, the module's trailing action opens a new **Tags** view added to Library's Files/Tracks/Loops/Playlists view-switcher — not a Recents-owned screen. That view lists every in-use tag with its usage count, sortable by name or count (ascending/descending), and searchable by tag name; tapping a row opens the tag detail screen (below). Recents stays "optional acceleration," per its existing design contract — it is never the only way to reach a tag, and the Library Tags view is independently reachable from Library at any time, not only via the Recents overflow action.

**Alternative considered (superseded):** reuse Library's existing Files-scoped tag-filter popover (`LibrarySearchControls`) instead of building a new view. Rejected on confirmation with the user — that popover is gated behind Files view and a private "show filters" toggle with no sort/search of its own over the tag list itself, is not reachable via any existing router/state plumbing from outside `LibraryScreen`, and switching to Library while leaving it wherever the user last left it does not actually satisfy "see all tags, sorted and searchable" the way a dedicated view does.

**Alternative considered:** a standalone router destination (like the tag detail screen) rather than a five view-switcher entry. Rejected on confirmation with the user in favor of the view-switcher integration, so the Tags view is a first-class, permanently-reachable Library surface rather than something only reachable via Recents' overflow action, and reuses the view-switcher's existing lock/session-state conventions instead of introducing a second navigation pattern.

### Library gains a fifth "Tags" view, integrated into the existing view-switcher

Add `'tags'` as a new member of `SavedRehearsalLibraryView` (alongside `'files' | 'tracks' | 'loops' | 'playlists'`), and wire it into every place that union already branches on view: the view-switcher chip row, `detail-mode.ts`'s per-view visible-sections table, and the existing view-switcher lock machinery (`view-switcher-lock-model.ts`, task `2.9.6`'s lock signals) — the same integration points each of the four existing views already goes through, so the Tags view inherits identical conventions (lock-while-editing, consistent chip styling) for free instead of a bespoke implementation.

The view's content is a plain list, one row per tag from `aggregateRehearsalLibraryTags`, showing the tag name and its usage count, with:
- A sort control (Name / Count, each ascending or descending), defaulting to the same most-used-first-then-alphabetical order the aggregation query already returns.
- A search input scoped to this list only (reusing the shared contextual search panel scaffold, matching the tag detail screen's own search below), filtering by tag name substring.
- Tapping a row navigates to the tag detail screen (below) for that tag.

**Alternative considered:** compute and cache a separate "all tags" list distinct from `aggregateRehearsalLibraryTags`. Rejected — the existing aggregation query already returns exactly `{ tag, count }[]`; the Library Tags view only adds presentation-level sorting/search on top of the same data Recents already consumes, so both surfaces share one source of truth with no risk of drift.

### One new tag detail screen, reusing existing shared primitives

Add one new screen (new router destination, not a new top-level tab) that both a Recents chip and the Library Tags view navigate to, taking a tag string as its parameter. It reuses:

- The shared compact destination-header primitive for its title (the tag name) and back action.
- The shared contextual search panel scaffold (task `4.6.1`) for the text-search input, scoped to this tag's matches only.
- A type-filter chip row (Tracks / Loops / Playlists / Folders, plus an implicit "All"), using the existing chip family (task `4.6.4`).
- The existing per-entity row shells (saved-track, saved-loop, saved-playlist-card, Files folder row) for list rows, so a track/loop/playlist/folder looks the same here as it does in its native view — this screen is a filtered lens over existing rows, not a new visual language.
- The existing shared playback-action primitive for the tag-level "Play" control (icon-first, matching Recents/playlist-card conventions), placed in the screen's compact header trailing area next to (not replacing) the type filter and search entry points.

**Alternative considered:** render the tag detail content inline as an expanding section on Recents itself. Rejected — Recents is explicitly optional/compact by design, and a tag can contain an unbounded number of items; a dedicated screen matches how Files/Tracks/Loops/Playlists already handle open-ended lists.

### Row filtering happens before playable-set expansion, and play always queues the currently-filtered set

The tag detail screen's canonical state is an ordered list of **matches** — the tracks, loops, playlists, and folders that carry the tag — before any expansion. Type filter and search apply to that match list (search matches on the match's name; type filter narrows which entity kinds are shown). The play action always expands **the currently-filtered match list**, not the tag's full unfiltered contents, directly satisfying the proposal's filter-then-play requirement: filtering first, then pressing play, is how a user intentionally narrows what gets rehearsed.

### Folder and playlist matches expand recursively into their contained tracks/loops for queueing

A folder or playlist that itself carries the tag is one row in the match list (tapping it navigates to Files-at-that-folder or playlist detail, same as everywhere else in the app). When the filtered match list is expanded into a playable queue:

- A tagged track or loop contributes itself.
- A tagged playlist contributes its saved items in playlist order (same source as `buildPlaylistPlaybackSession` already uses for normal playlist playback).
- A tagged folder contributes every track/loop reachable from it, including through nested subfolders, in the same order the Files explorer would list them (reusing the Files explorer's existing folder-listing resolution rather than writing a second folder-walk). `RehearsalLibraryFolderNode.parentFolderId` forms a single-parent tree (each folder has exactly one parent), so a cycle should not be constructible through normal folder operations, but the walk still tracks visited folder ids defensively (matching the existing `buildScopedFolderIds` precedent) so a corrupted/cyclic tree degrades to "stop expanding," never an infinite loop.
- Nested tagging is not required to double-count: if a folder is tagged and a track inside it is _also_ directly tagged with the same tag, that track's presence via the folder expansion and its own direct match should not produce two queue entries for the same track — see the dedupe open question below.

### Tag playback reuses the transient-queue session type via a new multi-item constructor

Add a sibling to `createTransientPlaybackSession` (in `playlist-playback-queue-state.ts`) — e.g. `createTransientPlaybackSessionFromItems(items: PlayableItem[], repeatMode)` — that seeds a `PlaylistPlaybackSession`'s `queue.items` with the full resolved, ordered `PlayableItem[]` instead of a single item, defaulting `currentIndex` to 0. Starting tag playback becomes: resolve the ordered `PlayableItem[]` as above, build the session with this new constructor, and load the first item exactly like `startPlaylistPlayback` already does for saved playlists. Everything downstream (advance/rewind, Up Next list, repeat mode, `Create new playlist`/`Update current playlist` from Up Next) works unchanged because it already only depends on `PlaylistPlaybackSession`'s shape, not on whether a real `Playlist` entity backs it.

**Alternative considered:** call `queuePlayableItemNext`/`queuePlayableItemUpNext` once per resolved item in a loop to build up the queue incrementally. Rejected — it's O(n) redundant session rebuilds for what should be a single atomic "start this queue" operation, and it would transiently show a wrong "queueing item 1 of N" progression in the UI while the loop runs.

## Risks / Trade-offs

- [Large tags could resolve into very large queues (e.g., a tag applied to a folder with hundreds of tracks)] → No queue-size cap in this design; rely on the existing Up Next scrollable-queue treatment (task `4.2.11`) to keep the UI usable. Revisit if this proves to be a real rehearsal-scale problem.
- [Recursive folder expansion could be slow for deep trees computed synchronously on tap] → Reuse the Files explorer's existing folder-listing resolution (already used for normal browsing) rather than a new implementation, so performance characteristics match what Files browsing already tolerates; if it's not already async/memoized there, that's this change's problem to solve too, not a new one to introduce.
- [Tag aggregation recomputation on every Recents render] → Compute it from the same in-memory saved-library state Library's tag filter already reads, memoized on that state, not recomputed from storage on every render.
- [This change's queue-integration surface depends on removal/tag-editor flows fixed in `streamline-mobile-rehearsal-ux`'s `2.9` tasks] → Sequence this change's implementation after (or in parallel with, but not ahead of) those fixes landing, per the proposal's Impact section.

## Open Questions

- **Dedupe when a track is reachable both directly and through a tagged folder/playlist under the same tag.** Default assumption above is "queue once," but the exact dedupe key (source id? playable-item id, which differs for loops vs full tracks?) needs to be pinned during implementation.
- **Cap value and "most-used" tie-break for the Recents tag list** — 6 is a placeholder default matching the current chip count; confirm during implementation against how Recents actually looks with a real tag corpus.
- **Whether the tag detail screen needs its own sort control** (matching Files' Name/Type/Date sort) or whether match order (most-recently-tagged first? alphabetical?) is fixed. Not specified by the proposal; default to alphabetical-by-name within each type group unless product direction says otherwise.
