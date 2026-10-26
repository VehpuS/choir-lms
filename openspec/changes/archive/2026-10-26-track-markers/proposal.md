## Why

Singers rehearse a piece in sections — "Verse 2", "the bridge", "bar 41" — but the app can only play a track from its start or by scrubbing the waveform, and loops are the only way to remember a place. A marker is a lighter tool: a named point in the track to jump to, which can also become the boundary of a loop. Loops already mark places in a track, so their start and end points should appear as markers too.

## What Changes

- Add per-track markers: a name and a time in the track's audio. Users add one at the playhead from the playback screen, or by long-pressing the waveform; they can rename, move (nudge or set to the playhead), and delete explicit markers.
- Add a `Markers` action to the shared saved-item menu (tracks, loops, adjusted tracks) and to the playback screen overflow. It opens a markers list where tapping a marker jumps to it, or loads the track and starts playing from it when it is not the loaded item.
- Derive loop markers: every saved loop of the track contributes a read-only `<Loop name> start` and `<Loop name> end` marker, computed from the loops themselves so they follow edits and disappear when a loop is deleted. A filter in the list (`All` / `My markers`) hides them, and the choice is remembered on the device. A loop marker can be kept as an explicit marker.
- Draw marker flags on the playback waveform and in the loop editor; tapping a flag jumps (playback screen) or picks it (loop editor).
- Use markers in the loop editor: select the Start or End field, then tap a marker flag on the waveform or press `Pick marker` to choose from the list. Markers are read-only in the loop editor.
- Turn markers into loops: `Loop to next marker` on a marker, selecting two markers and pressing `Make loop`, and `Create loops from markers`, which previews the sections between consecutive explicit markers and creates the checked ones as named loops.
- Markers belong to the owning track, in the track's audio time, and are shared by its loops and adjusted copies (a loop shows only markers inside its range). They are not library files: they never appear in Files, search, tags, sorting, playlists, or bulk actions.
- Out of scope: marker colours or categories, importing or exporting markers, markers on playlists or folders, markers in the mini-player, sharing between users, cue-point or chapter metadata in the audio file, and generating adjusted tracks from markers (adjustments stay a whole-track or whole-loop speed and pitch action).

## Capabilities

### New Capabilities

- `track-markers`: the marker record, adding, renaming, moving and deleting explicit markers, derived loop markers and the filter, the markers list and jumping, waveform flags, out-of-range handling, ownership by the track, and exclusion from library entities.

### Modified Capabilities

- `practice-loops-and-playlists`: picking loop boundaries from markers in the loop editor, and creating loops from markers (next marker, two markers, per section).
- `mobile-library-organization`: the `Markers` action in the saved-item menu, and the rule that markers are not library entities.
- `mobile-rehearsal-player-ui`: the `Markers` action in the playback overflow, long-press to add, and marker flags on the playback waveform.

## Impact

- `packages/audio-library-models`: a `TrackMarker` type and an optional `markers` list on `DriveAudioSource`, normalization at the storage boundary (names, order, limits), `resolveMarkerOwner`, `deriveLoopMarkers`, a merge and filter function for the list, and the section planner for `Create loops from markers`.
- `packages/audio-library-runtime`: repository and AsyncStorage persistence for the field and add, rename, move, and delete operations (no key migration); removing a track removes its markers.
- `packages/mobile-rehearsal-player`: a markers sheet, marker flags on the waveform components, the loop editor field-arming and marker picker, a device-level filter preference, the per-section preview dialog, menu entries and icon, and seek/start-from-position through the existing playback controller.
- No new dependency and no network call. Markers are stored locally with the library, like tags.
- README gets a short note on the capability.
