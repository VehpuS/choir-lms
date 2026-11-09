## 1. Model and storage

- [x] 1.1 Make `RecentRehearsalItem` a union with a playlist variant (`id` = playlist id, `playlistName`, `lastEntryId`, `playedAt`) in `screens/recents/history.ts`; update the parser to accept it and drop old per-track `playlist` rows, with `history.spec.ts` cases for both.
- [x] 1.2 Add `upsertRecentPlaylist` (replace by playlist id, move to the front, cap at five), with tests for update-in-place, reorder and eviction.

## 2. Recording

- [x] 2.1 Extract the recording decision from `routing/app-router.tsx` into a pure helper over the active item and session that returns the item to record. Branches: transient queue, saved playlist, no session. With tests for all three.
- [x] 2.2 Guard the saved-playlist branch so it records only when the active item's `playlistEntryId` is in the session queue; test the session-started-before-first-item window.
- [x] 2.3 Use the helper from the effect and verify that a started-from-track playlist records that track as `lastEntryId`.

## 3. Resume

- [x] 3.1 Add a resume resolver: given the playlist, its saved mode and `lastEntryId`, return the `startEntryId` or none when the entry is gone. Test present and removed entries.
- [x] 3.2 Wire playlist-row resume in `app-router-recents-screen.tsx` to `startPlaylistPlayback`, and hide rows whose playlist no longer exists; test the filtering.

## 4. Recents UI

- [x] 4.1 Make the row model handle the playlist variant (icon, `Playlist · Last played …` meta, no duration or transform), with `row-model.spec.ts` cases.
- [x] 4.2 Resolve how Recents gets the saved playlist menu handlers (record the answer in `design.md` open questions), then build the playlist row menu from `resolveSavedPlaylistMenu` plus `View in library`.
- [x] 4.3 Add the `Queue playlist` action to `overflow-actions.ts` (disabled while nothing is playing), with tests.
- [x] 4.4 Implement `Queue playlist`: resolve the playlist's items with `resolvePlaylistItems` and append them through `queuePlayableItemsAsUpNext`; test order, skipped items and transient queue seeding.
- [x] 4.5 Make `isRecentItemInLibrary` and the other track-assuming call sites handle the playlist variant.

## 5. Validation

- [x] 5.1 Verify in the browser preview: play a playlist through several tracks and see one row; resume it from Recents; remove its last track and resume; queue it from Recents during playback.
- [x] 5.2 Update the README if the Recents description changes.
- [x] 5.3 Run `lint`, `test`, `typecheck` and `build` for `mobile-rehearsal-player` and clear Problems in touched files.

## 6. Follow-ups found during implementation

Raised while building; not part of the original plan. Explore each with the user before implementing, and split into a follow-up change where it is not about playlists in Recents.

- [ ] 6.1 Items appended to a saved playlist session with `Add to queue`, `Play next` or `Queue playlist` have no entry of that playlist, so branch 2 of the recording rule records nothing and they never reach Recents (before this change they recorded as per-track playlist rows). Queued items from another playlist carry that playlist's entry ids and would be recorded against the running playlist with a `lastEntryId` it cannot resume (resume then falls back to the top). Explore with the user whether such items should record as tracks, as their own playlist, or not at all, then update the recording rule and spec.
- [ ] 6.2 Manual check not done in the browser preview: advancing through several tracks of one playlist and resuming after removing the last played entry. The preview's Drive session had expired, and the playlists with playable local items held a single playable composite, so this is covered by unit tests only (`recent-recording.spec.ts`, `recent-playlist.spec.ts`). Re-verify once a multi-item playable playlist is available.
- [ ] 6.3 A playlist row shows no track count or last track title. The design defaults to `Playlist · Last played …`; ask the user whether the meta line should say more (see design open questions).
