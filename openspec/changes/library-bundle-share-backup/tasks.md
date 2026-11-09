## 1. Bundle model and parser (`audio-library-models`)

- [x] 1.1 Define bundle types (`LibraryBundle`, scope, bundle-local ids, per-source owner, `importedFrom`) and the current `formatVersion` (done: `library-bundle.ts`; adjusted tracks stay in `sources` with `adjustment`, as in the library; `recordings` is left out of the type until 2.3 and the parser ignores it, dropping playlist entries that carry a `recordingId`; `importedFrom` is defined but not yet on bundle entities, since it is set on import)
- [x] 1.2 Add `needs-access` to the source availability reasons and make existing exhaustive switches handle it
- [x] 1.3 Implement the tolerant parser: unknown fields ignored, malformed or unresolved entities dropped and counted, newer version refused, "not a bundle" refused
- [x] 1.4 Add version-upgrade steps scaffolding and a spec proving an older fixture upgrades
- [x] 1.5 Specs for the parser using representative fixtures (valid, damaged, newer, not JSON)

## 2. Bundle builder (`audio-library-runtime`)

- [x] 2.1 Build a whole-library bundle from repository state, re-keying entities to bundle-local ids and rewriting every cross reference
- [x] 2.2 Build a folder bundle: subtree, dependents (loops, adjusted tracks, playlists, composites) via the existing bulk-impact logic, with a count of references left out (done in `library-bundle-selection.ts`; the existing bulk-impact code is app-side and removal-oriented, so the dependents logic is a pure runtime function instead. Dependents living elsewhere get a top-level link in the bundle; loops and composites linked in the folder whose tracks are outside are dropped and counted)
- [x] 2.3 Include recordings only when selected; reference an existing Drive copy from `RecordingExports`, otherwise mark the audio for upload (confirmed: recordings live only in a web IndexedDB store, native has none, outside the repository. Decided with the user: metadata-only format now. Done: `LibraryBundleRecording` with lineage re-keyed and audio `drive` or `not-uploaded`, builder returns `recordingsToUpload` and `uploadSizeBytes`. Reading recordings from IndexedDB, uploading the audio and restoring it are app-side and belong to 6.x and 7.x)
- [x] 2.4 Specs: ids rewritten, no device ids leak, dependents included, outside references counted, recordings off by default

## 3. Import planner (`audio-library-runtime`)

- [x] 3.1 Read the Drive import planner/classification and the placement plan, and note in this task what is reused (reused: the placement rules' `resolveRehearsalLibraryAvailableNodeName` and sibling-name lookup for the import root name and sibling names; the Drive import's convention that a plain track's id is `drive:<driveFileId>` so reuse by Drive file and retries are automatic. Not reused: the Drive import planner and its classification, which are app-side and shaped around Drive folder enumeration rather than a bundle)
- [x] 3.2 Plan an additive import: new import folder, recreated tree, name conflicts via the placement rules, id mapping for all entities
- [x] 3.3 Reuse a source with a matching `driveFileId`, merge tags, fill lyrics, sheet music and markers only where empty
- [x] 3.4 Record `importedFrom` on created entities and the import root, never on reused sources (done: `importedFrom` is optional on tracks, loops, playlists, composites and folders and survives storage; composite parsing keeps it)
- [x] 3.5 Specs: reuse, tag merge, content kept, conflicts, partial-failure retry does not duplicate

## 4. Import execution and replace (`audio-library-runtime`)

- [ ] 4.1 Execute an import plan through the repository write queue with outcomes, progress and cancel, following the Drive import executor's shape
- [ ] 4.2 Add `replaceLibrary(ownerId, state)` to the repository: stage new values, one swap marker write, tree last
- [ ] 4.3 Recover an interrupted swap on load (finish or roll back) so the library is never half replaced
- [ ] 4.4 Specs: replace commits once, interrupted swap recovers, derived caches left alone except for removed sources

## 5. Drive I/O (`google-drive`)

- [ ] 5.1 Ensure `Choir LMS/Backups` and `Choir LMS/Shares` using the folder-ensure helper
- [ ] 5.2 Upload a bundle with the `choirlmsBundle` app property and a dated name, using the resumable uploader; no partial file left listed on failure
- [ ] 5.3 List bundles from the user's folders and `Shared with me`, with the name-pattern fallback; verify early that `appProperties` of shared files are readable with the read-only scope
- [ ] 5.4 Prune old backups to the limit after a successful write, only app-created files, never an uncommitted pre-restore backup
- [ ] 5.5 Per-file access probe with bounded concurrency, and owner lookup for export
- [ ] 5.6 Specs for each helper with a fake Drive client

## 6. Backup and restore UI (`mobile-rehearsal-player`)

- [ ] 6.1 `Back up library` action with the write-scope check, recordings picker (off by default, size total) and confirmation
- [ ] 6.2 Restore sheet listing backups, with the `Add to my library` / `Replace my library` choice and neither preselected
- [ ] 6.3 Replace flow: pre-restore backup with all recordings, stop on failure, confirmation naming what is replaced, success message pointing at the undo backup
- [ ] 6.4 Specs for the pure view models; verify in the browser preview with the disposable test library

## 7. Share and import UI (`mobile-rehearsal-player`)

- [ ] 7.1 `Share` action on a library folder: preview with counts, left-out references and recordings choice, then write to `Shares` and show how to open it in Drive
- [ ] 7.2 Import list of bundles (own and `Shared with me`) and the import preview (new, reused, dropped, needs access)
- [ ] 7.3 Destination chooser and import progress with cancel; show `Imported from` on the import root folder
- [ ] 7.4 Specs for the view models; verify in the browser preview

## 8. Missing-access guide

- [ ] 8.1 Group needs-access sources by owner, falling back to the bundle author, and detect a shared original folder from `sourceLocation`
- [ ] 8.2 `Open in Drive`, `Email owner` (mailto), `Copy list` and `Check again` actions; copy that does not claim a cause
- [ ] 8.3 `needs-access` row state with `Open in Drive` and `Remove from library`, playback blocked with the clear message, recovery on a successful check
- [ ] 8.4 Specs for grouping, mailto and copy text, and recovery keeping loops and links

## 9. Wrap-up

- [ ] 9.1 Manual verification with two Google accounts: share a folder, import with and without access, request access, check again (needs the user to sign in)
- [ ] 9.2 Update the README and the architecture notes for the new package responsibilities
- [ ] 9.3 Run lint, test, typecheck and build for the affected projects through Nx

## 10. Future tasks (found while implementing; explore with a user before building)

- [ ] 10.1 Playlist entries that play a recording (`recordingId`) are dropped from bundles and counted as left out; carry them once recordings travel in a bundle end to end
- [ ] 10.2 Restoring recording audio into the web IndexedDB store, and what native should do while it has no recordings store (decide with the user before 6.x)
