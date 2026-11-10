## Why

Issue #42. A track has two names: the track entry (shown in Tracks, playlists and loops) and each Files copy's visible name. Today Files can rename only a copy's visible name, so the track keeps its old name everywhere else, and the Tracks view cannot rename at all.

## What Changes

- Tracks view: `Rename` becomes an overflow action on a track. It renames the track entry; Files copies that still carry the track's name follow it, copies the user named on purpose keep their own name.
- Files: renaming a track's only copy also renames the track entry.
- Files: renaming a copy of a track that has several copies asks `Rename all copies and the track` or `Rename this copy only`. A `Remember my choice` switch stores the answer on the device and the prompt is skipped afterwards.
- A name that clashes inside a folder stops the whole rename and leaves the track as it was; the existing `Use "<name>"` recovery is offered.

Not included: a setting to clear the remembered choice (follow-up), renaming loops or playlists (unchanged).

## Capabilities

### Modified Capabilities

- `mobile-library-organization`: track renaming from Tracks and Files, with the copies prompt.

## Impact

- `audio-library-runtime`: `renameTrack` on the practice repository (`rename-track.ts`).
- `mobile-rehearsal-player`: Tracks `Rename` action and dialog, Files copies prompt, remembered-choice storage, rename operation in the Files hook.
- Browser tooling: the mock library gains folders and copies, scenarios run through a shared runner, and `nx run mobile-rehearsal-player:browser-test` runs them.
