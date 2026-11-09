## Context

`history.ts` models a recent as `RecentRehearsalItem` with a required `playableItem`. The recording effect in `routing/app-router.tsx` appends an item whenever `activePlayableItem` changes. Inside a playlist session it builds `kind: 'playlist'` items whose id is `<playlistId>:<entryId>` and whose title is the track's title, so each advance adds a row. The cap is 5. Resuming a row calls `playPlayableItem`, which plays one item and ends the session.

`startPlaylistPlayback` already accepts `startEntryId` and falls back to the playlist start when building the session, and the transient queue session is identified by `isTransientQueueSession`.

## Goals / Non-Goals

**Goals:**

- One Recents row per saved playlist, updated as it plays.
- Resuming a playlist restores the playlist session, at the last track when it still exists.
- Playlist rows reuse the saved playlist menu and add `Queue playlist`.

**Non-Goals:**

- Migrating old per-track playlist rows.
- Changing the five-item cap.
- Recording transient queues as recents.
- Remembering position within the last track, shuffle order or per-run mode (the playlist's saved mode and repeat apply on resume).
- Adding `Play next` for a whole playlist.

## Decisions

### The recent item becomes a union

```
RecentRehearsalItem =
  | { kind: 'track' | 'loop' | 'composite'; playableItem; ... }   unchanged
  | { kind: 'playlist'; id: playlistId; playlistName; lastEntryId; playedAt; title }
```

The playlist variant has no `playableItem`, because it has no single item to play. `title` stays the playlist name so existing row code keeps a title. Alternative: keep `playableItem` as the last track's snapshot. Rejected: it goes stale when the track is renamed or removed, and it invites resuming through `playPlayableItem`, which is the bug being fixed.

### Recording stays in the existing effect, with three branches

The effect keeps reacting to `activePlayableItem` and `activePlaylistSession`:

1. Transient queue session: record the active item as a track, as today.
2. Saved playlist session: upsert the playlist entry (`id` = `playlistId`) with `lastEntryId` = the active item's `playlistEntryId`, move it to the front, then dedupe and cap at 5.
3. No session: record the item as today.

Starting from a given track is covered by branch 2, since that track becomes active. Alternative: record inside `startPlaylistPlayback`. Rejected: it needs a second hook for advances anyway, and the effect already owns recording.

### Record only when the active item belongs to the session

`startPlaylistPlayback` sets the session before its first item loads, so for a moment `activePlayableItem` is the previous item and the session is the new one. Branch 2 therefore requires the active item's `playlistEntryId` to be an entry in the session queue. Otherwise the effect would write the previous track's entry id, or nothing, against the new playlist. A mismatch records nothing. The effect runs again when the real item loads.

### Resume starts the session through `startPlaylistPlayback`

The router resolves the playlist by id from the library and calls `startPlaylistPlayback` with `startEntryId` = `lastEntryId` when that entry still exists in the playlist, and with no `startEntryId` otherwise. The check happens at resume time so the stored entry id never needs cleaning up. If the playlist no longer exists, the row is hidden from Recents; the stored entry ages out through the cap.

### The playlist row menu is the saved playlist menu plus one action

The row menu is built with `resolveSavedPlaylistMenu` and a Recents placement, so `Add items`, `Edit tags`, `Remove from library` and `View in library` are not reimplemented. `Queue playlist` is added as one action in the recents overflow model. It resolves the playlist's playable items with `resolvePlaylistItems` and appends them through `queuePlayableItemsAsUpNext`, so it keeps current playback going and seeds a transient queue from standalone playback exactly like `Add to queue` on a track. It is disabled while nothing is playing, matching `Add to queue`. Items that cannot be resolved are skipped, as in playlist playback.

### Restore drops what it cannot parse

`parseRecentRehearsalItem` accepts the new playlist shape. An old row with `kind: 'playlist'` has a `playableItem` and no `lastEntryId`, so it fails the playlist parse and is dropped. Track, loop and composite rows parse as before.

## Risks / Trade-offs

- [The wrong `lastEntryId` is written during session start] -> the entry-in-queue guard above, with a spec covering the window.
- [Recents code assumes every row has a `playableItem` (`isRecentItemInLibrary`, duration and transform labels, queue handlers)] -> make the union exhaustive so TypeScript flags each use, and cover the playlist variant in each model spec.
- [The saved playlist menu needs handlers (edit tags, remove, add items) that the Library surface owns] -> reuse the saved item request path rather than passing callbacks from the router; if that path cannot serve Recents, record it as an open question before building.
- [A playlist that was deleted leaves a dead row] -> hide rows whose playlist no longer resolves.
- [Shuffled playlists resume at `lastEntryId` but in a new order] -> accepted; the order is rebuilt from the playlist's saved mode.

## Migration Plan

None. The storage key and shape stay compatible. Unparseable stored rows are dropped on the next restore and rewritten on the next persist.

## Open Questions

- Which entry point supplies the saved playlist menu handlers inside Recents (see the risk above)? Decision (task 4.2, confirmed with the user): extend the saved item request channel with `playlist-add-items`, `playlist-edit-tags` and `playlist-remove` requests (`kind: 'playlist'`), which the Library section runs with its own by-id playlist handlers. The Recents playlist row menu is `resolveSavedPlaylistMenu` with `Queue playlist` and `View in library` as its view actions.
- Resume mode (found in task 3.1): playlists have no saved queue mode, so resume starts `ordered` from `lastEntryId`; the Decisions text above that mentions a saved mode is superseded.
- Should a playlist row show its track count, or the last track's title, in its meta line? Default: `Playlist · Last played …`.
