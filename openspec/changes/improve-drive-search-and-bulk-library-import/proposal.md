## Why

Google Drive discovery currently makes users find and save rehearsal tracks one at a time: search excludes folders, only the first page of Drive results is consumed, and saved tracks do not retain enough folder provenance to lead users back to nearby source material. Adding folder-aware search, reliable bulk import, and original-location navigation will make building and maintaining a rehearsal library practical for choirs whose music is already organized in Drive folder trees.

## What Changes

- Include matching Google Drive folders alongside supported audio files when searching the current Add location's full subtree, with enough path context to understand every result.
- Add selection mode for Drive search results, including individual selection, `Select all matching` across every paginated result, and deselection before import.
- Let users add a Drive folder recursively either by flattening all supported descendant audio into one Library folder or by recreating the selected Drive folder and its descendant structure under a chosen Library destination.
- Collapse overlapping folder and descendant-track selections so a bulk operation does not import the same source twice.
- Reuse an already-saved Drive track as the canonical Library source and add a missing folder link where appropriate instead of creating duplicate saved sources.
- Show a pre-import summary and import progress, retain partial successes, report unsupported/skipped/failed items, and allow failed work to be retried.
- Preserve each saved Drive track's original parent-folder identity and path context so Library surfaces can display where it came from.
- Add saved-track actions to show the original folder in Choir LMS's Add browser and to open that folder in the Google Drive app or website.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `mobile-practice-library`: Drive discovery gains paginated folder search, recursive enumeration, persisted source-folder provenance, and original-folder navigation.
- `mobile-library-organization`: Drive folder imports can flatten or reproduce Drive hierarchy inside a chosen Library destination while reusing canonical saved sources and resolving overlaps and conflicts.
- `mobile-rehearsal-player-usability`: Drive search gains mixed-result selection, complete `Select all matching`, import review/progress, and partial-failure recovery behavior.

## Impact

- Google Drive integration: `packages/google-drive` discovery queries, pagination, folder traversal, parent/path metadata, and result models.
- Shared domain and persistence: `packages/audio-library-models` source-provenance types and `packages/audio-library-runtime` migration and batch-save behavior.
- Mobile app: `packages/mobile-rehearsal-player/src/app/library/drive/**`, saved-library controllers and Files operations, Add search rows and selection/import sheets, and saved-track detail/management actions.
- Google Drive API traffic will increase for complete pagination, ancestry resolution, and recursive imports; traversal must remain cancellable and concurrency-bounded.
- No media is copied from Drive, and no new third-party dependency is expected.
