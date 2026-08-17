## Why

The Recents screen currently shows a "Popular shortcuts" module with five hardcoded chips (Soprano, Alto, Tenor, Bass, Warmup) from `packages/mobile-rehearsal-player/src/app/screens/recents/`. This was always a pre-implementation placeholder — design.md for `streamline-mobile-rehearsal-ux` describes the Recents shortcut module only as "optional quick shortcuts (for example popular tags)," anticipating that it would eventually be backed by real data. That change also introduced a real tag system (`tags?: string[]` on tracks, loops, playlists, and folders, with tag-based filtering already available in Library), but Recents never connects to it. Users cannot jump from a tag straight into rehearsing everything under it, even though the underlying tag data and the queue system to play a batch of items both already exist.

## What Changes

- Replace the static "Popular shortcuts" chip list on Recents with a dynamic list of tags actually present across the user's saved tracks, loops, playlists, and folders.
- Add a new **Tags** view to Library's existing Files/Tracks/Loops/Playlists view-switcher: a dedicated, always-reachable list of every in-use tag with its usage count, sortable by name or count (ascending/descending) and searchable by tag name. The Recents tag module's overflow action (when more tags exist than its compact cap) navigates here.
- Tapping a tag (from Recents, or from the new Library Tags view) opens a tag detail view listing every saved-library item carrying that tag: tracks, loops, playlists, and folders (a folder match is the folder itself, not its descendants — its own `tags` field, per the existing per-node tagging model).
- Add a play action on the tag detail view that queues the tag's contents through the existing queue implementation (the same transient-queue mechanism `Play next`/`Add to queue`/playlist playback already use): tagged tracks and loops queue directly; tagged playlists and folders queue their contained tracks and loops (folders recursively, including tracks/loops reached through nested subfolders).
- Add sorting (name / type / date added, ascending or descending), type filtering (tracks / loops / playlists / folders), and a text search scoped to the tag's matches on the tag detail view.
- **BREAKING (product behavior, not API)**: when a type or search filter is active on the tag detail view and the user presses play, only the currently-filtered subset is queued — not the tag's full unfiltered contents. This is an intentional scoping rule, not an accidental change, but it is worth flagging since "play the tag" and "play what's currently filtered" resolve to different playback sets depending on filter state.

### New Capabilities

- `recents-tag-navigation`: the Recents tag list module, the tag detail/browse view with type and search filtering, and tag-scoped queue playback (including folder-content recursion).

### Modified Capabilities

(none — this change is additive on top of the tag, Files-tree, and queue mechanisms introduced by `streamline-mobile-rehearsal-ux`; no existing merged spec's requirements change)

## Impact

- **Depends on** the not-yet-archived `streamline-mobile-rehearsal-ux` change for: the per-entity `tags` field and tag editor (`mobile-library-organization` capability), the file-tree/folder model used to resolve folder contents (`mobile-library-organization`), the Recents screen and its shortcut-module slot (`mobile-rehearsal-player-usability`), and the queue/transient-queue mechanism (`practice-loops-and-playlists`, `mobile-rehearsal-player-ui`). This change should not be archived or fully implemented ahead of `streamline-mobile-rehearsal-ux` reaching a stable state, since it builds directly on surfaces still being finalized there (see that change's open `2.9` follow-up tasks).
- **Code**: `packages/mobile-rehearsal-player/src/app/screens/recents/` (replace the shortcuts module), a new tag detail screen/route in the router, a new `tags` entry in Library's view-switcher (`packages/mobile-rehearsal-player/src/app/screens/library/`, `library/components/saved-rehearsal-library-section/`, `library/saved-rehearsal-library/detail-mode.ts`, the view-switcher lock model), `packages/audio-library-runtime` (a tag aggregation query, a per-tag match resolver, and a folder-content-resolution helper for queueing), `packages/audio-library-models` (adds `createdAt` to tracks and folders plus a per-tag `tagAddedAt` sidecar map, needed for the tag detail screen's date-based sort — see design.md).
- **No backend/API changes**: everything needed (tags, folder tree, queue) is already local/client-side state.
