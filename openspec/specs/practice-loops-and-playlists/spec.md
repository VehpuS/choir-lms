# practice-loops-and-playlists Specification

## Purpose

TBD - created by archiving change add-mobile-rehearsal-player. Update Purpose after archive.

## Requirements

### Requirement: Users can save named loops from a saved source track

The system SHALL allow a user to define a start marker and end marker on a saved playable source track and save that range as a named loop.

#### Scenario: Save a named loop

- **WHEN** a user sets valid start and end markers on a saved playable source track and provides a loop name
- **THEN** the system saves a named loop that can be played directly without redefining the markers

#### Scenario: Loop creation opens from a saved track

- **WHEN** a user chooses to make a loop from a saved rehearsal library track
- **THEN** the system opens a dedicated loop-creation surface for that track instead of keeping a persistent inline builder visible in the library

#### Scenario: Users define loop boundaries with a dual-thumb range slider

- **WHEN** a user adjusts the loop-creation range slider
- **THEN** the system updates the proposed start and end boundaries from the two thumb positions, keeps visible time labels for the selected range, and preserves the selected track and range summary before save

#### Scenario: Reject an invalid loop range

- **WHEN** a user attempts to save a loop whose end marker is not after its start marker
- **THEN** the system prevents the loop from being saved and explains that the selected range is invalid

### Requirement: Playlist membership persists through ordered playlist entries

The system SHALL persist playlist membership through app-owned ordered playlist-entry relationships between a playlist and a saved rehearsal item so saved tracks and saved loops can participate in many-to-many playlist assignments while each playlist keeps its own explicit sort order.

#### Scenario: Add to an existing playlist creates an ordered membership

- **WHEN** a user completes `assignToExistingPlaylist` for a saved track or saved loop
- **THEN** the system creates a playlist-entry relationship at the next available index in the selected playlist without duplicating the underlying saved item

#### Scenario: Create a playlist during add flow also creates the first membership

- **WHEN** a user completes `createNewPlaylist` with a `PlaylistName` during playlist assignment
- **THEN** the system creates the playlist and its first ordered playlist-entry relationship for the selected saved item

#### Scenario: A saved item can belong to multiple playlists with independent order

- **WHEN** the same saved track or saved loop is added to more than one playlist
- **THEN** each playlist stores its own explicit index values for that item's playlist entries without affecting the ordering of any other playlist

#### Scenario: Save reordered playlist indexes

- **WHEN** a user completes `saveEdits` after running `updateTrackIndex`
- **THEN** the system persists the updated index array for that playlist's entries and leaves the order of other playlists unchanged

#### Scenario: Remove a playlist membership without deleting the source item

- **WHEN** a user runs `removeFromPlaylist` for an item in a playlist
- **THEN** the system removes only that playlist-entry relationship and keeps the underlying saved track or saved loop available in the rehearsal library and any other playlists

### Requirement: Saved tracks and loops can both be used as playlist items

The system SHALL allow a user to add either a saved full source track or a saved loop to a playlist as a playable item.

#### Scenario: Add a saved full track to a playlist

- **WHEN** a user adds a saved playable source track to a playlist
- **THEN** the playlist contains that track as an item that plays from the beginning of the source through its full duration

#### Scenario: Add a saved loop to a playlist

- **WHEN** a user adds a saved loop to a playlist
- **THEN** the playlist contains that loop as an item that plays only within the saved marker range

#### Scenario: Add the same saved rehearsal item more than once

- **WHEN** a user adds the same saved track or saved loop to a playlist multiple times
- **THEN** the playlist preserves each insertion as a separate queue item and playback keeps each occurrence in its own ordered or shuffled position

### Requirement: Playlist playback supports rehearsal-oriented queue control

The system SHALL play playlist items in sequence and support repeat and shuffle modes suitable for rehearsal practice.

#### Scenario: Start playback from a selected playlist position

- **WHEN** a user taps a track or loop row within a playlist detail view
- **THEN** the system starts playback from that row's persisted playlist index and queues the remaining items from that same playlist in order after it

#### Scenario: Ordered playlist playback

- **WHEN** a user starts playback of a playlist with shuffle disabled
- **THEN** the system plays the playlist items in their saved order

#### Scenario: Shuffle playlist playback

- **WHEN** a user starts playback of a playlist with shuffle enabled
- **THEN** the system plays playlist items in a shuffled order for that playback session

#### Scenario: Repeat playlist playback

- **WHEN** a user enables playlist repeat during playback
- **THEN** the system continues playback according to the selected repeat behavior instead of stopping at the last item

#### Scenario: Repeat track playback

- **WHEN** a user enables repeat for a single track or loop during playback
- **THEN** the system continues to repeat that item instead of advancing to the next playlist item until the user disables repeat or advances manually

### Requirement: Mobile playback integrates with native transport surfaces

The system SHALL expose the active playback session through supported native mobile transport surfaces for the MVP platform.

#### Scenario: Background playback remains controllable

- **WHEN** a user sends the app to the background during active playback
- **THEN** the system keeps the playback session controllable through supported native transport controls

#### Scenario: Native transport controls affect the active queue

- **WHEN** a user uses a supported native transport control such as play, pause, next, or previous
- **THEN** the system applies that command to the active rehearsal playback queue

### Requirement: Adjusted tracks and loops are usable wherever saved tracks and loops are usable

The system SHALL accept entities created from playback shaping as playable items in every rehearsal flow that accepts a saved track or saved loop.

#### Scenario: Adjusted entities can be queued and reordered

- **WHEN** a user queues an adjusted track or loop as next, adds it to the end of the queue, or reorders it
- **THEN** the system treats it exactly as it treats a saved track or saved loop

#### Scenario: Adjusted entities can be playlist items

- **WHEN** a user adds an adjusted track or loop to a playlist
- **THEN** it persists as an ordered playlist entry and plays in sequence with ordered, repeat, and shuffle behavior unchanged

#### Scenario: Adjusted entity playback applies its stored transform

- **WHEN** playback starts for an adjusted entity
- **THEN** the system applies that entity's stored speed and pitch transform for the duration of its playback, and restores the ambient session shaping when playback moves to an item that carries no transform

### Requirement: Loop boundaries can be picked from markers in the loop editor

The loop editor SHALL let a user select the Start or End field and set it from a marker. Selecting a field SHALL arm it with a visible outline; while armed, tapping a marker flag on the waveform, or pressing the flag button on the field's card and choosing from the markers list (the button is always present, disabled when the track has no markers, so arming never shifts the layout), SHALL set that boundary to the marker's position and disarm the field. Tapping the armed field SHALL disarm it. Picking SHALL set only the armed boundary, unless the marker would put the start at or after the end (or the end at or before the start): the editor SHALL then ask before changing anything, offering to move the other boundary to the track's start or end (only when that makes a usable range), to pick another marker, or to cancel, so the draft is never left unusable. While a field is armed, markers that would need that choice SHALL be drawn dimmer on the waveform and listed after the usable markers under their own heading, and SHALL remain selectable. The editor SHALL draw the track's markers on its waveform and offer a `Hide markers` / `Show markers` control. Markers in the loop editor SHALL be read-only (no add, rename, move, or delete). Loop starts and ends SHALL NOT appear as markers in the loop editor at all (neither as flags nor in the picker, whatever the device filter says): the editor offers only the user's own markers.

#### Scenario: Pick a start from a flag

- **WHEN** the user taps the Start field and then taps the flag for `Verse 2` at 1:00
- **THEN** the loop start becomes 1:00, the field disarms, and the end is unchanged

#### Scenario: Pick an end from the list

- **WHEN** the user taps the End field, presses `Pick marker`, and chooses `Bridge` at 2:10
- **THEN** the loop end becomes 2:10

#### Scenario: Pick would invert the range

- **WHEN** the end is 1:00 and the user picks a start marker at 1:20 on a 4:00 track
- **THEN** a dialog names the marker and the conflict and offers `Move end to the track end (4:00)`, `Pick another marker`, and `Cancel`, and nothing changes until the user chooses

#### Scenario: Moving the other edge

- **WHEN** the user chooses `Move end to the track end (4:00)`
- **THEN** the start becomes 1:20, the end becomes 4:00, and the field disarms

#### Scenario: No room to move the other edge

- **WHEN** the user picks an end marker at 0:00
- **THEN** the dialog offers only `Pick another marker` and `Cancel`, because the start cannot move before the track start

#### Scenario: Usable and unusable markers are separate

- **WHEN** the Start field is armed with the end at 1:00
- **THEN** markers after 1:00 are dimmer on the waveform and listed in a separate group below the usable ones in the picker

#### Scenario: Markers are read-only here

- **WHEN** the user long-presses the waveform in the loop editor
- **THEN** no marker is added

### Requirement: Markers can become loops

The system SHALL offer three ways to create loops from a track's markers, all using the existing loop validation and saving. `Loop to next marker` on a marker SHALL open the loop editor in create mode with that marker as start and the next marker in the displayed list as end (the track end for the last marker when the length is known), named after the marker. Selecting exactly two markers and pressing `Make loop` SHALL open the editor with the earlier as start and the later as end. `Create loops from markers` SHALL list the sections between consecutive explicit markers, with an `Include intro` option adding an `Intro` section from the start of the track to the first marker (off by default), name each section after its start marker, mark and uncheck sections that equal an existing loop of the track, or that are too short to be a valid loop, give a section that reuses a name already used by a loop of the track or an earlier section the smallest free ` (n)` suffix from 2, and, on confirming, save the checked sections as loops. Loop-derived markers SHALL NOT be section boundaries.

#### Scenario: Loop to next marker

- **WHEN** the user chooses `Loop to next marker` on `Verse 1` at 0:30 with the next marker at 1:00
- **THEN** the loop editor opens with start 0:30 and end 1:00, named `Verse 1`

#### Scenario: Two markers

- **WHEN** the user selects markers at 2:00 and 1:00 and presses `Make loop`
- **THEN** the loop editor opens with start 1:00 and end 2:00

#### Scenario: Loops per section

- **WHEN** a track of 3:00 has explicit markers `Verse` at 0:20, `Chorus` at 1:00, and `Bridge` at 2:00 and the user opens `Create loops from markers`
- **THEN** the dialog lists `Verse` 0:20–1:00, `Chorus` 1:00–2:00, and `Bridge` 2:00–3:00, all checked, and confirming saves three loops named for their start markers

#### Scenario: Include intro

- **WHEN** the user turns on `Include intro`
- **THEN** an `Intro` section from 0:00 to 0:20 is added to the list

#### Scenario: Existing loop is skipped

- **WHEN** a loop already covers exactly 1:00–2:00 of the track
- **THEN** the `Chorus` section is listed unchecked, marked as already a loop

#### Scenario: Repeated name is numbered

- **WHEN** a section is named `Verse` and a loop of the track is already named `Verse`
- **THEN** the section is listed checked as `Verse (2)` and saved with that name

#### Scenario: Unknown length

- **WHEN** the track's length is unknown
- **THEN** the last section is not offered, and `Loop to next marker` on the last marker is unavailable
