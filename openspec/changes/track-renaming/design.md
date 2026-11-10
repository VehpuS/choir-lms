## Decisions

- **One runtime operation.** `renameTrack(ownerId, { sourceId, name, copies })` saves the track, then saves the affected copies in one `saveLibraryNodes` batch. Each copy is given the new name explicitly so the library's existing per-folder clash check covers it; if any copy clashes, the track is saved back as it was and the error is thrown.
- **`copies: 'all' | 'matching'`.** `all` is the user's explicit choice (or the only copy). `matching` is the Tracks view: only copies still named like the track (or with no own name) follow, so a deliberately named copy is not overwritten.
- **Rename this copy only** needs no new operation: it is the existing link rename.
- **Remembered choice** lives in device storage (`choirlms.library.track-rename-copies-choice`), like other per-device preferences. The decision (`planFilesRename`) is a pure function of the row, the copies and the remembered choice.
- Loops and adjusted tracks keep a denormalised `sourceName` that the library repairs from the saved track on read, so they need no extra writes.
