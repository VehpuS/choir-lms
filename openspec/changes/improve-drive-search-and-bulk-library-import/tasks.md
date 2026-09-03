## 1. Complete Drive Pagination and Traversal

- [ ] 1.1 Add a shared abort-aware Drive files paginator that follows `nextPageToken`, deduplicates items by Drive id, fails rather than returning a silently partial set, and cover first-page, multi-page, duplicate, abort, and later-page-failure behavior with focused `google-drive` tests.
- [ ] 1.2 Route Drive browse and unscoped audio search through the paginator, preserving current sorting and availability partitioning, and add regression tests proving results beyond item 100 are returned.
- [ ] 1.3 Route descendant-folder discovery and folder-scoped audio search through complete pagination, retaining bounded Drive query batches, fallback-to-direct-folder behavior only for descendant discovery failure, and focused deep-tree/multi-page tests.
- [ ] 1.4 Add a cancellable recursive folder-content enumerator that returns accessible folders plus supported and unsupported audio metadata across all pages, caches visited folder ids, guards against cycles, and has focused deep-tree, shared-folder, unsupported-file, abort, and partial-failure tests.

## 2. Mixed Folder and Audio Search

- [ ] 2.1 Introduce discriminated folder/audio discovery result types and update Drive search queries/parsing to return matching folders plus supported audio in the active root or folder subtree, with package tests for type partitioning and root/subtree exclusion.
- [ ] 2.2 Add a bounded-concurrency, operation-cached Drive path resolver using `parents` metadata that returns root kind and the deepest accessible folder path, with tests for My Drive, shared folders, inaccessible ancestors, repeated ancestors, and deterministic handling of multiple parents.
- [ ] 2.3 Attach resolved path metadata to browse and search results and update `useDriveLibrary` search state to consume mixed results without changing browse navigation, with focused model/hook tests for path labels, scope changes, and stale-request cancellation.

## 3. Saved Source Provenance

- [ ] 3.1 Add optional structured Drive source-location provenance to `DriveAudioSource`, update runtime parsing/fixtures without requiring authorization-time backfill, and test that legacy persisted sources still load unchanged.
- [ ] 3.2 Persist provenance when saving a newly discovered source and refresh Drive-owned metadata/provenance when resaving an existing source while preserving tags, tag timestamps, `createdAt`, and Library links; add repository and controller regression tests.
- [ ] 3.3 Add pure view models for readable original-path presentation and original-location action availability, including legacy and deepest-accessible-path states, with focused tests before wiring UI actions.

## 4. Recursive Import Planning

- [ ] 4.1 Add a dependency-light import-selection normalizer that collapses nested selected folders, removes separately selected descendant tracks, deduplicates by Drive file id, and reports overlap counts; cover mixed and deeply overlapping selections with focused tests.
- [ ] 4.2 Add a pure import planner for `Flatten` and `Preserve structure` that maps recursively enumerated Drive contents into the chosen Library destination, creates the selected folder as each preserved import root, excludes unsupported files with summary counts, and test both modes across multiple selected roots.
- [ ] 4.3 Extend the planner to classify new, reusable, and already-linked sources by Drive identity and allocate deterministic keep-both folder/link names in Drive path/id order; test case-insensitive conflicts and replanning against partially imported state.

## 5. Recoverable Batch Execution

- [ ] 5.1 Define typed import progress phases and itemized outcomes for created, reused, already-present, unsupported, overlap-collapsed, cancelled, and failed work, with pure aggregation tests for review and completion summaries.
- [ ] 5.2 Implement the Library batch executor using repository-safe writes and bounded Drive reads, updating progress while retaining independent successes after item-level failures; add integration tests covering source reuse, folder/link creation, and branch-local failure continuation.
- [ ] 5.3 Add cancellation that stops scheduling new work without rollback and retry planning that consumes only failed/cancelled remainder against current Library state; add integration tests proving partial completion and idempotent retry.
- [ ] 5.4 Expose plan/execute/cancel/retry operations through the saved-library/Drive controller boundary while preserving the existing single-track save flow, and add focused controller tests for state transitions and error recovery.

## 6. Add Search Selection and Import UI

- [ ] 6.1 Render mixed Drive search rows with folder/audio identity, matched-text highlighting, full path context, folder browse behavior, existing audio preview/save behavior, and focused row view-model tests.
- [ ] 6.2 Add query-bound selection mode with visible row state, selected count, cancel, individual deselection, and `Select all matching` that prepares every result page; add state-model tests proving query/root/folder changes clear stale selection.
- [ ] 6.3 Add the import review flow with Library destination selection, conditional `Preserve structure`/`Flatten` choice, and effective-plan counts for folders, new/reused/already-present tracks, unsupported files, and collapsed overlaps; test review-state transitions and folder-free selections.
- [ ] 6.4 Add preparing/import progress and completion UI with cancellation, categorized outcomes, dismiss, and retry-failed actions; test the presentation models for active, cancelled, partial-failure, successful, and retried states.

## 7. Original Drive Folder Actions

- [ ] 7.1 Show the last-known original Drive path and provenance-dependent actions in saved-track detail/management surfaces without conflating it with the track's Library folder placement, with focused presentation tests.
- [ ] 7.2 Add a shared source-location resolver that fetches current metadata by saved `driveFileId`, resolves the current accessible parent/path, detects a moved file, and persists refreshed provenance while preserving app-owned fields; add focused tests for unchanged and moved files, root changes, renamed ancestors, inaccessible parents, deleted files, authorization failure, and lookup failure without stale-folder fallback.
- [ ] 7.3 Add `Show in Add` routing that uses the shared live resolver before switching roots or reconstructing the breadcrumb stack, opens the resolved current parent after a move, and preserves the user's current context plus last-known path when resolution fails; add router/hook tests proving it never opens a still-existing stale parent folder.
- [ ] 7.4 Add `Open in Google Drive` through the same live resolver plus a tested current-folder URL builder and React Native Linking adapter, including moved-file routing, resolution failure without stale-folder fallback, unsupported-link, and open failure feedback, without changing the existing source-file `webViewLink` behavior.

## 8. Integrated Validation

- [ ] 8.1 Run focused and full Nx test, typecheck, and lint targets for `google-drive`, `audio-library-models`, `audio-library-runtime`, and `mobile-rehearsal-player`, and clear Problems in every touched file.
- [ ] 8.2 With an authenticated Drive account, manually verify My Drive and shared-folder search, more than 100 results, mixed selection and deselection, overlapping selections, flat and preserved imports, cancellation/retry, source reuse, a source file moved to a different folder after save, inaccessible/deleted source files and folders, `Show in Add`, and external `Open in Google Drive` on web and at least one native mobile platform.
