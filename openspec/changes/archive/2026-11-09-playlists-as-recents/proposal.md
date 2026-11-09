## Why

Recents records every track that becomes active, so playing a playlist writes one row per track. A single run fills all five slots with the same playlist's tracks and evicts the user's other recents. Tapping such a row plays that one track alone and drops the playlist. The playlist is what the user practised, so the playlist should be the recent item.

## What Changes

- A saved playlist becomes one Recents entry, identified by its playlist id and carrying its name, when it last played and the entry that played last.
- Tracks advancing inside a saved playlist session update that entry in place (last entry, last played) and never add rows of their own.
- Starting a playlist from a specific track records the playlist with that track as its last entry.
- Resuming a playlist row starts the playlist at its last entry, or at the top when that entry has since been removed from the playlist.
- The transient `Current queue` session records no playlist entry. Tracks played from it keep recording as tracks.
- Playlist rows reuse the existing saved playlist menu and add one new action, `Queue playlist`, that appends all of the playlist's playable items to the queue.
- The five-item cap stays. Stored `playlist` rows from before this change (one per track) are not migrated and are dropped on restore.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-rehearsal-player-quick-wins`: the requirement "Recents provides fast recent rehearsal entry points" gains the playlist entry, its resume rule, and its overflow menu with `Queue playlist`.

## Impact

- `packages/mobile-rehearsal-player/src/app/screens/recents/`: `history.ts` (entry union, parse, upsert), `row-model.ts`, `overflow-actions.ts`, `recent-rehearsal-row.tsx`, `recent-rehearsal-menu.tsx`, `index.tsx`, `app-router-recents-screen.tsx`.
- `packages/mobile-rehearsal-player/src/app/routing/app-router.tsx`: the recording effect branches on the session kind.
- `packages/mobile-rehearsal-player/src/app/library/components/saved-item-menu/saved-item-menus.ts`: reused, possibly with a recents placement.
- Playback: `startPlaylistPlayback` is reused with `startEntryId`; queueing uses the existing `queuePlayableItemsAsUpNext` helpers.
- No shared package, dependency or storage key changes. The history key `choirlms.recents.history` keeps its name and drops rows it cannot parse.
