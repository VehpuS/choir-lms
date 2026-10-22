## Context

A saved track is a `DriveAudioSource`; a loop is a `NamedLoop` with `sourceId`, `startMs`, `endMs`; an adjusted track is a `DriveAudioSource` with `adjustment.sourceRef` and a speed/pitch transform (shaping scales playback, so positions in the audio file are unchanged). Optional per-track data (tags, lyrics, sheet music) is stored as an optional field on the source, parsed at the storage boundary, and read by loops and adjusted tracks through an owner resolver (`resolveLyricsOwner`, `resolveSheetMusicOwner`). The loop editor (`library/loops/components/loop-editor/`) already has a waveform with A/B handles, start/end range cards with nudges, and `Set start here` / `Set end here` from the preview position. The shared saved-item menu defines the actions for tracks, loops, and adjusted tracks; the playback screen has an overflow menu built from it.

Users decided: markers live on the track and are shared by loops and adjusted copies; loop start/end markers are derived live and read-only with a filter; markers turn into loops (next marker, two markers, per section); they are added at the current time from the playback screen and by waveform long-press; flags are drawn on the waveform; the loop editor picks boundaries from markers and shows them read-only; the entry is the saved-item menu and the playback overflow; markers outside a loop's range are hidden there; sections come from explicit markers only, named after the start marker.

## Goals / Non-Goals

**Goals:**

- Jump to a named point of a track in two taps, from the library or from playback.
- Reuse loop boundaries as markers and markers as loop boundaries without any two-way sync to maintain.
- Keep markers inside the track: they are never a library file and never affect search, sort, tags, playlists, or bulk operations.

**Non-Goals:**

- Colours, categories, import/export, sharing, audio-file cue metadata, markers on playlists or folders, a marker in the mini-player, and adjusted tracks generated from markers.

## Decisions

### Decision 1: Markers are an optional list on the saved track

Add `markers?: TrackMarker[]` to `DriveAudioSource` with `TrackMarker = { id: string; name: string; positionMs: number; createdAt: string }`. Parsing and normalization happen where the record is read: `positionMs` is a finite non-negative integer; `name` is trimmed, non-empty, and at most 60 characters (longer is truncated, empty is replaced by `Marker N`); ids are unique (duplicates dropped); the list is sorted by `positionMs` then `createdAt`; a list of more than 200 is truncated at the read boundary and refused at the add boundary with a message. Malformed entries are dropped, and an empty list deletes the field. Old records have no field and need no migration. Two markers may share a position.

Alternative considered: a separate collection keyed by track id, or by Drive file id so markers survive removing and re-adding a track. Rejected: removal already deletes tags and lyrics with the track, a second store needs its own delete path, and the user chose the track as owner.

### Decision 2: Loops and adjusted tracks resolve to the owner, in audio time

`resolveMarkerOwner(item, sources)` is the same resolution as lyrics and sheet music (track to itself, adjusted track through `adjustment.sourceRef`, loop through `sourceId` then the same hop; `null` for a missing owner); it reuses the existing resolver and only adds the marker-facing name. Positions are always in the original audio's time, never in shaped time, so the same marker is correct for a track at 0.75× and for its adjusted copy. Editing markers from a loop or an adjusted track edits the owner's, and the sheet subtitle says `Markers for <track name>`.

### Decision 3: The list is a merge of explicit and derived markers

`deriveLoopMarkers(owner, loops, sources)` returns read-only entries `{ origin: 'loop-start' | 'loop-end', loopId, name: '<Loop name> start' | '<Loop name> end', positionMs }` for every loop whose owner resolves to the track (including loops of its adjusted copies). `buildMarkerList({ explicit, derived, filter, range, durationMs })` merges them, sorts by position (explicit first at equal positions), applies the filter (`all` or `mine`, where `mine` is explicit only), and applies a range window:

- Track context (menu opened from a track or an adjusted track): all markers.
- Loop context (menu opened from a loop, or the loop being the playing item): only markers with `startMs <= positionMs <= endMs` of that loop.

Markers beyond a known `durationMs` are kept in the list flagged `isPastEnd` (greyed, not jumpable, with the message `Past the end of this audio`); they are never deleted automatically, because the audio file can be replaced. Because the list is computed, nothing needs syncing when a loop is created, edited, or deleted.

`Keep as marker` on a derived row copies it into an explicit marker (name and position), leaving the loop untouched.

### Decision 4: Adding, editing, and jumping

- Adding: `Add marker here` in the markers sheet and in the playback overflow (when the playing item resolves to the track), and a long-press on the playback waveform (adds at the pressed position). New markers get the name `Marker N`, where N is the smallest positive integer not used by an existing `Marker N`, and a brief confirmation with a `Rename` action. Adding is not offered when the track is not the loaded item (no position to take); the list is still readable and jumpable.
- Editing: an explicit row's menu offers `Rename`, `Move` (a small dialog with ±0.1 s and ±1 s nudges, `Set to current position`, and a typed `mm:ss.s` field), and `Delete` (with undo through a toast, no confirmation dialog). Derived rows offer `Open loop` (opens the loop editor) and `Keep as marker`.
- Jumping: tapping a row seeks to `positionMs` when the owner (or one of its loops or adjusted copies, matching the playing item) is loaded, by absolute audio position through the existing playback controller; when the track is not loaded it loads the owning item and starts playing from the marker (the same entry as playing the item, then seek on ready). In a loop context the seek position is clamped inside the loop and loop playback continues. The playing item's kind and shaping are preserved.

### Decision 5: Waveform flags

The playback and loop editor waveforms draw a flag per marker in the current filtered list: explicit markers as a full-height accent hairline with a small flag, loop markers as a shorter dimmer tick. Flags never draw labels; the name appears in a transient label above the flag while pressed, and in the sheet. Flags closer than 12 pt merge into one drawn flag pointing at the earliest (the sheet still lists all). Tapping a flag jumps (playback) or picks it for the armed field (loop editor, Decision 6). Long-press on empty waveform adds a marker (playback screen only); long-press on a flag opens its row menu. In the loop editor markers are read-only: no add, rename, move, or delete there. The loop being edited contributes no derived markers (its own boundaries are the thing being changed); its other loops do.

### Decision 6: Picking loop boundaries from markers

In the loop editor the Start and End range cards become selectable. Tapping a card arms it (accent outline); while armed, tapping a marker flag on the waveform, or pressing `Pick marker`, sets that boundary from the marker. `Pick marker` opens the same list as a picker (filter retained, loop's own markers excluded, out-of-range handling does not apply because the loop covers the whole track). Picking sets only the armed boundary, except when the pick would put the start at or after the end (or the end at or before the start): the editor then asks first, offering to move the other edge to the track's start or end (whichever makes room; only offered when it does), to pick another marker, or to cancel, so the draft is never unusable. Markers the armed edge cannot take without that are drawn dimmer on the waveform and listed after the usable ones, under `At or before the loop start` / `At or after the loop end`, and stay tappable. After a pick the card disarms. Tapping the armed card disarms it.

### Decision 7: Markers to loops

All three go through the existing loop editor or the existing save-loop operation, so validation and naming are unchanged.

- `Loop to next marker` on a row opens the loop editor in create mode with start = that marker and end = the next marker in the displayed list (or the track end for the last row, only when the duration is known), named after the marker.
- Two-marker selection: a `Select` mode in the sheet (checkbox rows); with exactly two chosen, `Make loop` opens the editor prefilled with the earlier as start and the later as end.
- `Create loops from markers`: `planMarkerSections(explicit, durationMs, existingLoops, { includeIntro })` builds the sections between consecutive explicit markers (the last ends at the track end and needs a known duration; the first starts at the first marker, and with `Include intro` on there is an extra `Intro` from 0 to the first marker). Each section is named after its start marker. Sections that equal an existing loop of the owner (same start and end in ms), that are too short to be a valid loop under the existing range rules, or that would repeat a name already used are marked and unchecked. The dialog lists the sections with checkboxes and shows `Create N loops`; confirming saves the checked ones through the loop save operation, with no tags. Derived loop markers are never section boundaries.

### Decision 8: Markers are not library entities

Markers have no entry in the file tree, no `RehearsalLibraryEntityKind`, no tags, no sorting, no playlist entry, and are not indexed by search or bulk operations. The only places they appear are the markers sheet, the picker, and the waveform flags. Removing a track removes its markers (the removal-impact flow already lists tags and lyrics; it gets no new line because markers are internal to the track). `Create a copy` of a Files link points at the same source and therefore the same markers.

### Decision 9: The filter is a device preference

`markers-filter-preference` stores `all` or `mine` under `choirlms.markers.filter` (default `all`), parsed at the read boundary (unknown falls back to `all`), shared by the sheet, the picker, and the waveform flags.

## Risks / Trade-offs

- [Derived markers shift when a loop changes while the sheet is open] → the list is recomputed from state; rows keep stable keys (loop id plus origin).
- [Many markers crowd a small waveform] → flags merge below 12 pt, no labels on the waveform, 200-marker cap.
- [A marker exists beyond a replaced audio file's end] → flagged and never deleted, only unavailable to jump to.
- [Seeking into a loop from outside its range] → the list hides outside markers in a loop context; the controller clamps if one slips through.
- [Naming collisions in per-section loops] → collisions are unchecked by default and shown, not silently renamed.

## Migration Plan

No migration. The field is optional; rolling back leaves unread fields, which the existing parser ignores.

## Open Questions

None. Decisions above were confirmed with the user on 2026-10-18 (ownership by the track with sharing, live read-only loop markers with a filter, loops from next marker / two markers / per section from explicit markers named after the start marker, adding at the playhead and by long-press, waveform flags, picking in the loop editor with read-only markers, entry from the saved-item menu and the playback overflow, hiding out-of-range markers in a loop).
