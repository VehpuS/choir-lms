## Why

The rehearsal library (folders, tags, loops, playlists, composites, markers, lyrics, sheet music, recordings) lives only in this device's browser or app storage. Clearing site data, switching phones, or a director wanting to hand a repertoire to singers all fail: there is no backup, no restore, and no way to pass an organized library to someone else. Audio itself is already safe on Drive and addressed by global Drive file ids, so a small snapshot of the library's references and organization is enough to rebuild it anywhere the files are readable.

## What Changes

- Add a **library bundle**: one versioned JSON manifest holding a snapshot of the whole library or of one library-folder subtree (sources by `driveFileId`, folders, loops, playlists, composites, adjusted tracks, tags, markers, lyrics, sheet music links), plus author, per-source owner and original-location hints.
- **Backup**: write a bundle of the whole library to a visible Drive folder the app creates (dated files, last N kept). Recordings are opt-in.
- **Share**: write a bundle of a chosen library folder (with the loops, playlists and composites that depend on it) to a Drive subfolder the user then shares with people in Drive. The app never changes Drive permissions.
- **Import**: open a bundle (from the user's backups or from `Shared with me`) and add it to the library, always **additively into a new folder**, reusing an existing source when the `driveFileId` matches and mapping ids so nothing existing is touched. Imported items carry an `Imported from <author>` provenance mark.
- **Restore**: opening one of the user's own backups asks `Add to my library` or `Replace my library`. Replace first writes a pre-restore backup (including recordings), stops if that fails, then swaps the library in one commit. Undo is restoring that pre-restore backup.
- **Missing access**: importing never waits on access. Files the user cannot open still import using the bundle's metadata and show as needing access; a guide groups them by owner with `Open in Drive` (Drive's request-access page), `Email owner`, `Copy list` and `Check again`.
- Add a `needs-access` availability reason for sources the user cannot currently open.
- Tolerant parsing at the boundary: unknown fields ignored, bundles from a newer `formatVersion` refused with a clear message.

Not included: live or synced shared libraries, editing a shared library together, changing Drive permissions, accounts or identities beyond the author recorded in the bundle, importing from a local file.

## Capabilities

### New Capabilities

- `library-bundle`: the bundle format and its parser, building a bundle from the library or a subtree, dependents and dangling references, provenance.
- `library-backup-restore`: writing, listing, retaining and pruning backups on Drive; restore as additive import or replace with a pre-restore backup; recording opt-in.
- `library-share-import`: sharing a library folder as a bundle, finding bundles in `Shared with me`, the import preview and additive import with id mapping and source reuse, and the missing-access guide.

### Modified Capabilities

- `mobile-library-organization`: imported folders and items are ordinary Files entities and show an `Imported from` mark; a source can be unavailable for `needs-access` and recovers when access arrives.
- `mobile-practice-library`: the `drive.file` write scope is also requested for writing bundles, and the availability feedback gains the `needs-access` reason.

## Impact

- `packages/audio-library-models`: bundle types, builder, tolerant parser, `needs-access` availability reason.
- `packages/audio-library-runtime`: import planner (id mapping, source reuse, folder placement), replace/stage-and-swap on the repository, which needs a bulk replace operation alongside the per-entity saves.
- `packages/google-drive`: bundle folder ensure, upload, list, prune, `sharedWithMe` bundle discovery, per-file access probe, owner lookup on export.
- `packages/mobile-rehearsal-player`: Backup and Share actions, import/restore sheets and preview, access guide, provenance mark, recordings opt-in selection.
- Reuses the Drive import planner/executor patterns, the library-tree placement plan, the existing recording Drive export record and the resumable uploader.
- No new scopes beyond the existing `drive.readonly` and `drive.file`; no dependency changes expected.
