## Context

Drive discovery currently has separate browse and audio-only search snapshots. Folder-scoped audio search already discovers descendant folder ids, but Drive list requests stop after the first 100-item page, discovered sources carry only a root-level `locationLabel`, and `DriveAudioSource` does not preserve its original parent folder. Saving is a single-source UI operation followed by an optional link into the independent app-owned Library tree.

This change crosses `google-drive`, `audio-library-models`, `audio-library-runtime`, and the mobile app. It must handle large and shared Drive trees without copying media, preserve existing user-owned tags and Library links, and tolerate Drive content changing or becoming inaccessible between discovery and import.

## Goals / Non-Goals

**Goals:**

- Search folders and supported audio recursively within the currently selected Add root or folder.
- Fetch complete paginated result and folder-content sets for `Select all matching` and recursive import.
- Plan deterministic flat or structure-preserving imports before mutating the Library.
- Reuse canonical saved sources and make batch work observable, cancellable, and retryable without rolling back successes.
- Persist useful Drive parent/path provenance and navigate back to the original folder inside Add or in Google Drive.

**Non-Goals:**

- Copying, moving, renaming, uploading, or deleting Google Drive content.
- Continuously synchronizing the Library tree with later Drive folder changes.
- Reproducing non-audio Drive files or Drive permissions in Library.
- Making Library folder organization identical to Drive after import; users remain free to reorganize Library links independently.
- Importing every item from an unfiltered Drive root without an explicit search or folder selection.

## Decisions

### Drive list operations consume all pages through a shared paginator

Move page-token handling below browse, search, descendant discovery, and recursive enumeration so each operation explicitly chooses either a complete result or a future paged presentation API. The paginator follows `nextPageToken` until exhausted, propagates abort signals, and deduplicates by Drive item id to guard against page drift. A failed later page fails the discovery operation instead of silently presenting a partial set as complete.

`Select all matching` enters a preparing state while all pages for the active query and scope are fetched. Its selection is bound to that query snapshot; changing the query, scope, or current Drive location clears selection. This is preferred over treating the first rendered page as "all," which would make the action depend on Drive page size.

### Search returns a mixed, path-aware result union

Add a discriminated Drive search result model for folders and audio sources. Queries match names case-insensitively through Drive's supported `name contains` behavior and stay scoped to the active location's full subtree. A selected matching folder represents the folder itself and, at import time, all supported audio in its descendant tree; descendants do not also need to match the search query.

Drive metadata requests include `parents`. Path resolution walks parent metadata toward the active root, caches folder metadata for the operation, and returns the deepest accessible path when a shared ancestor cannot be read. Results retain root kind plus folder id/name segments rather than a display-only string. Modern Drive files normally have one parent; when metadata contains multiple parents, use the first accessible parent consistently and record only that navigation path.

Global My Drive and shared-root searches may require a result-specific ancestry lookup. Resolve paths with bounded concurrency and reuse metadata across results to control API traffic.

### Saved sources store optional source-location provenance

Extend `DriveAudioSource` with optional structured provenance rather than treating a local `RehearsalLibraryFileLinkNode` as source location:

```ts
type DriveSourceLocation = {
  parentFolderId: string;
  parentFolderName: string;
  rootKind: 'my-drive' | 'shared';
  path: Array<{ id: string; name: string }>;
};
```

The local file link continues to mean "where this entity is organized in Library"; source location means "where Drive reported this file lived." Saving or rediscovering a source refreshes Drive-owned metadata and provenance while preserving app-owned fields such as tags, tag timestamps, and `createdAt`.

The provenance is optional for backward compatibility. Existing saved sources remain valid and show no original-folder action until rediscovery supplies location metadata. This avoids a blocking migration that would need Drive authorization during local repository startup.

### In-app and external original-folder actions have separate semantics

Both source-folder actions first request current metadata for the saved `driveFileId`, resolve its current accessible parent and ancestry, and compare that location with the stored provenance. When the file moved, the app persists the newly resolved parent/path while preserving app-owned source fields, then uses that current location for the requested action. Validating only the stored parent folder is insufficient because that folder may still exist after the file has moved elsewhere.

`Show in Add` switches to Add only after current file metadata and ancestry resolve successfully, selects the resolved root, and reconstructs the breadcrumb stack from current folder ids and names. If the file was deleted, became inaccessible, has no accessible parent, or current location resolution fails, the app keeps the user in context, retains the last-known path for reference, and reports that the source's current location cannot be resolved. It does not silently navigate to the stale stored parent.

`Open in Google Drive` performs the same current-file resolution, then passes `https://drive.google.com/drive/folders/<currentParentFolderId>` to React Native Linking. The operating system may open the Drive app or a browser. This is intentionally distinct from the existing file `webViewLink`: the folder action supports inspecting, sharing, uploading, and managing nearby source material. A resolution failure reports the problem instead of opening the last-known folder as though it were current.

### A pure import planner precedes persistence

Build a framework-independent planner from selected mixed results, recursively enumerated folder contents, saved source ids, and the chosen Library destination/mode. It:

1. Collapses selected folders contained by another selected folder.
2. Removes separately selected tracks contained by a selected folder.
3. Deduplicates tracks by Drive file id.
4. Excludes unsupported files while retaining counts for review.
5. Produces the required Library folder graph and file-link operations.

For `Preserve structure`, create a Library folder named after each top-level selected Drive folder under the chosen destination, then recreate descendants beneath it. For `Flatten`, create no imported subfolders and link every selected/descendant track directly into the chosen destination. Individually selected tracks are always linked directly into the chosen destination.

The review step shows the post-collapse plan: destination, mode, folders to create, new tracks, reused saved tracks, unsupported files, and overlaps removed. Planning is side-effect free so it can be tested independently and recomputed if the destination or mode changes.

### Existing source and name conflicts are deterministic

Drive file identity, not visible name, determines canonical source reuse. If a source is already saved, update its Drive-owned metadata/provenance and create only a missing destination link. If that exact entity is already linked in the target Library folder, count it as already present.

Drive permits sibling folders and files with equal names while the Library file tree rejects case-insensitive duplicate visible names. Structure-preserving import uses the existing keep-both naming convention to allocate stable unique Library folder and link names. The planner reserves names in deterministic Drive path/id order so retries produce the same available names given the same destination state.

This is preferred over prompting per conflict, which would make large imports impractical and difficult to resume.

### Batch execution preserves successes and reports itemized outcomes

Execute the approved plan with bounded concurrency for Drive reads and sequential or repository-safe writes for Library mutations. Report phase and completed/total counts. Cancellation stops scheduling new work but does not roll back already-created sources, folders, or links. Failures are recorded per operation; independent work continues where its parent folder exists.

The completion result distinguishes created, reused, already-present, unsupported, overlap-collapsed, cancelled, and failed items. Retry builds a new plan from failed items against current Library state, naturally reusing successes from the first attempt. This favors recoverability over a transaction that cannot span Google Drive and local persistence.

## Risks / Trade-offs

- [Large or deeply nested Drive trees cause many API requests] -> Cache metadata per operation, batch parent queries where Drive supports them, bound concurrency, expose preparing/import progress, and honor abort signals.
- [Drive changes between selection, review, and import] -> Treat the plan as a snapshot, validate reads during execution, retain successes, and report missing or inaccessible items individually.
- [Stored path names or parent ids become stale after a file is renamed or moved] -> Treat provenance as a last-known display snapshot, resolve current file metadata before every source-folder action, and persist a successfully resolved current path.
- [Shared-root ancestry may be incomplete because ancestors are inaccessible] -> Keep the deepest accessible path, identify the result as shared, and fail navigation gracefully rather than hiding the source.
- [Keep-both names diverge from Drive names] -> Preserve original Drive path metadata separately and use adjusted names only for the app-owned Library organization.
- [Cancellation leaves a partial folder tree] -> State this in the progress UI and completion summary; retry is idempotent and reuses already-completed entities.

## Migration Plan

1. Add optional provenance fields and tolerant repository parsing so old persisted sources load unchanged.
2. Ship complete pagination and mixed search models before enabling bulk controls.
3. Add the planner and batch executor behind the new import flow, retaining the existing single-track save action as a supported path.
4. Enable original-location actions only when provenance is present.
5. Rollback can hide the new UI and stop writing provenance; optional fields and already-imported Library entities remain readable by the previous behavior.

## Open Questions

None. Exact concurrency limits and keep-both suffix formatting should reuse or extend nearby implementation constants without changing the behavioral contract above.
