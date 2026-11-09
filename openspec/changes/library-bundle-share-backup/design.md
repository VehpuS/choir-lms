## Context

The library is app-owned JSON in AsyncStorage (`choirlms:practice:*` keys, one owner `local-device-user`): sources keyed by `driveFileId`, a `library-tree` of folder nodes and file links, loops, playlists, composites, adjusted tracks, plus per-source tags, lyrics, sheet music links and markers. Audio is never stored in the library; composites explicitly store references only. Recordings are the one exception: the singer's own audio lives on the device, but each recording already has a `RecordingExports` record naming the Drive copies the auto-export queue made.

Drive file ids are global. A snapshot that records `driveFileId` therefore works for anyone who can read the file, with no identity logic. The app holds `drive.readonly` and `drive.file`; `drive.file` lets it create files and read or change only files it created, so it can write bundles but cannot change permissions on audio the user merely owns. Drive has no API to request access to a file; only Drive's own page does that. A file the user cannot open returns 404 whether it was deleted or never shared.

Existing machinery to reuse: the Drive import planner/executor (classify against library state, plan, execute with concurrency and outcomes), `planRehearsalLibraryPlacement` (name conflicts), `library-files-bulk-impact` (what depends on what), the composite relink code, `drive-folder-ensure`, the resumable uploader, `SourceAvailability`, and `sharedWithMe` queries in `drive-file-queries`.

## Goals / Non-Goals

**Goals:**

- One bundle format for backup (whole library) and share (a folder subtree).
- Additive import that cannot damage existing data, and a restore that offers a safe replace.
- Importing never blocks on Drive access; the user is guided to get the missing access.
- Pure, framework-agnostic model, builder, parser and planner with unit tests; Drive and UI at the edges.

**Non-Goals:**

- Live or synced shared libraries, or collaborative editing.
- Changing Drive permissions or requesting the full `drive` scope.
- Accounts or identity beyond the author recorded in the bundle.
- Importing a bundle from a local file (web file picker); can follow later.
- Backing up derived data (peaks, audio cache) or UI preferences.

## Decisions

### 1. One manifest, scope varies

`LibraryBundle { formatVersion, createdAt, author, scope, sources, folders, fileLinks, loops, playlists, composites, recordings? }`. `scope` is `{ kind: 'library' }` or `{ kind: 'folder', name }`. Backup and share differ only in scope, destination and whether recordings are offered.

Alternatives: separate formats per use (duplicates parser and import code); a Drive-native structure of many small files (no atomic snapshot, many requests).

### 2. Bundle-local ids; the bundle is self-contained

The builder re-keys every entity to stable bundle-local ids and rewrites cross references (loop to source, playlist entry to loop or track, composite stem to track, file link to entity, folder to parent). The parser validates that every reference resolves inside the bundle and drops (and counts) any that does not. This makes import a pure id-mapping problem and means a bundle never leaks device ids.

### 3. Tolerant parser at the boundary, newer versions refused

Parsing happens once, at the edge. Unknown fields are ignored, malformed entities are dropped with a count, and a `formatVersion` greater than the app's is refused with a message to update the app. Older versions are upgraded through small step functions. Typed, normalized data passes deeper, per the repo's TypeScript policy.

### 4. Share includes dependents; dangling references are counted

Sharing a folder subtree collects its tracks, then the loops and adjusted tracks owned by those tracks, playlists whose entries are all (or any) in scope, and composites whose stems are in scope. A playlist or composite that points outside the subtree keeps its in-scope parts; references to outside items are removed and reported in the export preview as `N references to items outside this folder were left out`. Reuses the impact logic in `library-files-bulk-impact`.

Alternative: refuse to export subtrees with outside references (too strict for real folders).

### 5. Where bundles live on Drive

Visible folders created by the app (so `drive.file` can read and manage them):

```
Choir LMS/
├─ Backups/   choir-lms-backup-2026-11-09T1530.json   (last N kept, default 5)
└─ Shares/    <folder name> 2026-11-09.json
```

`appDataFolder` is rejected: hidden and not shareable. Retention prunes only files the app created in `Backups/`. A bundle is one JSON file; the user shares `Shares/` (or a file) in Drive themselves. Bundles are identified by name pattern plus app-set `appProperties` (`choirlmsBundle: 'v1'`) so discovery does not rely on names alone.

### 6. Finding bundles to import

Two sources, both listing bundle files: the user's `Choir LMS/Backups` and `Shares`, and `sharedWithMe` filtered by the `appProperties` marker. `appProperties` set by the app are visible to another user's read with `drive.readonly`. If a sender used a copy or download that dropped the property, a name-pattern fallback applies. Reading a bundle uses `drive.readonly`; no write scope is needed to import.

### 7. Import is additive and id-mapped, in plan then apply

```
parse → preview(plan) → user confirms → apply
```

The planner is pure over `(bundle, current library state, destination)`:

- Create a new library folder `Imported <name> <date>` under the chosen destination; the bundle's folder tree is recreated beneath it, names made unique with the existing placement-plan conflict rules.
- For each bundle source, reuse the existing library source when `driveFileId` matches (merging tags; keeping the existing lyrics, sheet music and markers unless empty), otherwise create a new source.
- Loops, playlists, composites and adjusted tracks always import as new entities with fresh ids, pointing at the mapped sources.
- Every created entity and the new root folder record `importedFrom: { author, bundleName, importedAt }`. Reused sources get no overwrite of their own provenance.

The apply stage follows the Drive import executor's shape: ordered writes through the repository write queue, per-item outcomes, and progress. A failure leaves a valid partial library (every write is self-consistent) and a retry reuses sources already created, since reuse is by `driveFileId`.

Alternative: merge into existing folders by name (conflict rules multiply; additive into a fresh folder is easy to explain and to undo by deleting one folder).

### 8. Restore: add or replace

Opening one of the user's own backups asks `Add to my library` (the additive import above) or `Replace my library`. Replace:

1. Write a pre-restore backup, always including recordings, to `Backups/` named `pre-restore`. Exempt from retention pruning until the restore commits.
2. If that fails or is cancelled, stop; the library is untouched.
3. Build the full replacement state in memory from the bundle.
4. Commit through one repository `replaceLibrary(ownerId, state)` that writes all keys, tree last, so a reader never sees a tree pointing at missing entities. Because AsyncStorage has no transaction across keys, `replaceLibrary` stages new values under a `…:staging` suffix, then swaps with a single marker key write, and recovers on next load if interrupted (marker present means finish the swap).
5. Keep the pre-restore backup and tell the user where it is; undo is restoring it.

Derived caches are left alone and are dropped only for sources that no longer exist. Recordings missing from the bundle are removed only after the pre-restore backup has them.

A shared (someone else's) bundle may also be restored via Replace, with firmer wording naming the author.

Alternative: write straight over the keys in sequence (a crash mid-way corrupts the library).

### 9. Recordings are opt-in, and reuse existing Drive exports

Recordings have two parts: metadata and audio. A bundle includes recording metadata and audio for chosen recordings. If a recording's audio is already on Drive (`exports.done` has a `recording` copy), the bundle references that Drive file instead of uploading again; otherwise the audio is uploaded beside the manifest and referenced by id. The picker shows a size total before anything uploads. The pre-restore backup selects all recordings automatically and is the only non-opt-in case. On import, recording audio is downloaded lazily (kept as a Drive reference like other exports) rather than all at once.

### 10. Missing access is a state, not a failure

On import preview and after import, each source is probed with a metadata request. Reachable sources look normal. Unreachable ones import using the bundle's snapshot (name, duration, size) and get `availability: { status: 'unavailable', reason: 'needs-access' }`. A new `needs-access` reason is added rather than reusing `access-revoked`, which says the opposite thing.

The access guide groups needs-access sources by owner (from the bundle's per-source `owner`, falling back to the bundle author when absent):

- `Open in Drive`: `https://drive.google.com/file/d/<id>/view`, which shows Drive's Request access button.
- `Email owner`: a `mailto:` with the file names and links prefilled, one message per owner.
- `Copy list`: names and links as text for any chat app.
- `Check again`: re-probes and flips recovered sources to available.

Because 404 is ambiguous, copy says `Can't open. Ask the owner to share it.`, never `no permission`. Owner name and email are captured at export from `owners` on the file (read with `drive.readonly`); the bundle author's own files may lack it, so it is optional. If a bundle's `sourceLocation` paths show a Drive folder, the preview says `These 30 are in "Soprano parts"` so the user can ask for the folder once.

### 11. Code placement

- `audio-library-models`: bundle types, `needs-access` reason, bundle-id mapping and the tolerant parser (pure).
- `audio-library-runtime`: bundle builder (from repository state), import planner, replace staging, `replaceLibrary` on the repository.
- `google-drive`: ensure `Choir LMS/{Backups,Shares}`, upload bundle (reusing the uploader), list bundles (own and `sharedWithMe`), prune, access probe, owner lookup.
- `mobile-rehearsal-player/src/app/library/bundle/`: Backup and Share actions, import and restore sheets, access guide, recordings picker. Menus reuse the saved-item menu conventions.

### 12. Provenance

`importedFrom` is a small optional object on folders, sources, loops, playlists and composites. The Files view shows `Imported from <author>` on the import root folder only, so rows stay quiet; item detail shows it where relevant.

## Risks / Trade-offs

- [AsyncStorage has no multi-key transaction] → staging plus a single swap marker and recovery on load; covered by an interruption test on the replace path.
- [`appProperties` may not reach a recipient, or a copy drops them] → name-pattern fallback in discovery; import by opening any JSON the user picks is a later option.
- [Owner lookup adds a request per file at export] → batched file metadata requests and best-effort; absence degrades to the bundle author.
- [Large libraries make big manifests and many probes on import] → probe with bounded concurrency (as the import executor does), show progress, allow cancel; sizes stay small since audio is not embedded.
- [Replace is destructive] → mandatory pre-restore backup with recordings, stop on failure, explicit confirmation naming what will be replaced.
- [A bundle from a future version] → refused with a clear message rather than half-read.
- [Imported items point at files the user cannot open] → the needs-access state and guide above; import still gives the full structure.
- [Recordings of other people in a shared bundle] → opt-in per recording with a size and privacy note; never selected by default for Share.

## Migration Plan

Purely additive. No existing storage keys change shape; `importedFrom` and `needs-access` are optional and absent on existing data. The `replaceLibrary` staging keys are new and only exist during a restore. Rollback is removing the feature; existing libraries are unaffected.

## Open Questions

- Default backup retention count (proposed 5) and whether to offer scheduled backups; this change ships manual Backup only.
- Whether the web build can read `appProperties` of `sharedWithMe` files with `drive.readonly` as assumed; verify early in the Drive-listing task and keep the name-pattern fallback if not.
- How recording metadata is stored on web versus native, to confirm the recordings export path in the builder (to be read when implementing).
