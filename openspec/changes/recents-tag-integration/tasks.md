## 1. Tag Aggregation Foundation

- [x] 1.1 Add a library-wide tag aggregation query (likely in `audio-library-runtime`) that scans saved tracks, loops, playlists, and folders and returns the deduped, normalized set of in-use tags with per-tag usage counts, reusing `normalizeLibraryEntityTags`'s trim/whitespace/case-insensitive dedupe rule rather than reimplementing it.
  - Decision (confirmed with user): `normalizeLibraryEntityTags` currently lives app-side (`tag-editor-sheet/model.ts`), but `audio-library-runtime` cannot depend on the app. Move `normalizeLibraryEntityTags` into `@org/audio-library-models` (new `src/lib/rehearsal-tags.ts`, exported from the package `index.ts`) so both the app's tag editor and the new runtime aggregation query share one implementation. `parseLibraryTagInput`/`addLibraryEntityTag`/`removeLibraryEntityTag` stay in the app's `model.ts` and import the moved function from `@org/audio-library-models`.
  - New query: `aggregateRehearsalLibraryTags` in `packages/audio-library-runtime/src/lib/rehearsal-library-tags.ts`, taking `{ entityCollections: RehearsalLibraryEntityCollections; folders: RehearsalLibraryFolderNode[] }` and returning `RehearsalLibraryTagUsage[]` (`{ tag, count }`), pre-sorted most-used-first with an alphabetical tie-break (case-insensitive) so task `2.1`'s Recents cap can simply slice the result. `count` = number of distinct entities carrying the tag (post per-entity dedupe). Exported from the package root (`index.ts`) for app consumption.
- [x] 1.2 Add focused unit tests for the aggregation query: cross-entity dedupe with mixed casing/whitespace, usage counts, and the empty-library (no tags) case.

## 2. Recents Tag Module

- [ ] 2.1 Replace the hardcoded `RECENTS_SHORTCUT_TAGS` array and the no-op `onPlayRecentShortcut` wiring in `screens/recents/` with the real aggregated tag list from `1.1`, capped and ordered most-used-first with an alphabetical tie-break.
- [ ] 2.2 Replace the always-shown placeholder chip row with concise empty-state guidance when no saved entity carries a tag yet.
- [ ] 2.3 Add an overflow entry point to a full tag list when more tags exist than the Recents module's compact display cap.
- [ ] 2.4 Wire tag chip taps to navigate to the new tag detail screen (task `3.1`) with the selected tag, instead of the current no-op shortcut handler.
- [ ] 2.5 Update the existing Recents `screen-copy`/`overflow-actions` focused tests for the new tag-driven module, and add coverage for the empty-state and overflow-entry-point branches.

## 3. Tag Detail Screen

- [ ] 3.1 Add a new tag detail router destination/screen shell, using the shared compact destination-header primitive for the tag name and back action.
- [ ] 3.2 Resolve and render the tag's direct matches (tracks, loops, playlists, folders) using the existing native row shells for each entity type.
- [ ] 3.3 Add a type filter chip row (Tracks / Loops / Playlists / Folders) scoped to this tag's matches, using the existing chip family.
- [ ] 3.4 Add a search input scoped to this tag's matches only, using the shared contextual search panel scaffold.
- [ ] 3.5 Wire folder and playlist match rows to open Files-at-that-folder and playlist detail respectively when tapped outside the play action, per the spec's non-play navigation requirement.
- [ ] 3.6 Add focused view-model tests for match resolution, type filtering, and search filtering on the tag detail screen.

## 4. Tag Queue Expansion and Playback

- [ ] 4.1 Implement folder-tag expansion: recursively resolve every track/loop reachable from a tagged folder, including nested subfolders, reusing the Files explorer's existing folder-listing resolution instead of a new folder-walk.
- [ ] 4.2 Implement playlist-tag expansion: resolve a tagged playlist's contained tracks/loops in playlist order, reusing the same item-resolution path `buildPlaylistPlaybackSession` already uses for normal playlist playback.
- [ ] 4.3 De-duplicate the final resolved playable set so a track/loop reachable through more than one matched path (e.g. tagged directly and via a tagged folder) queues exactly once; pin the dedupe key (source id for tracks, loop id for loops) called out as an open question in design.md.
- [ ] 4.4 Add a multi-item transient session constructor (e.g. `createTransientPlaybackSessionFromItems`) alongside `createTransientPlaybackSession` in `playlist-playback-queue-state.ts`, seeding an ordered `PlayableItem[]` queue instead of a single item.
- [ ] 4.5 Wire the tag detail play action to expand the currently-filtered (not full unfiltered) match list from `3.2`–`3.4` and start playback via the new multi-item transient session, matching the filter-then-play scenario in the spec.
- [ ] 4.6 Add focused tests for folder expansion, playlist expansion, cross-path dedupe, and the new multi-item session constructor.

## 5. Final Validation

- [ ] 5.1 Manually verify the full flow in the integrated browser: Recents tag list reflects real tags (including empty-state and overflow-entry-point branches) → tag detail lists correct matches → type filter and search narrow correctly → playing filtered vs. unfiltered queues the right set → Up Next reflects that queue with working transport/repeat/reorder → folder/playlist row taps navigate correctly outside of play.
- [ ] 5.2 Run project typecheck and lint on touched files, and the narrowest relevant Nx test targets (`audio-library-runtime`, `mobile-rehearsal-player`), before considering this change ready to archive.
