# track-markers Specification

## Purpose

Named markers saved on a track: their storage and ownership, loop start and end points shown as read-only markers, jumping, and flags on the waveform. Created by archiving change track-markers.

## Requirements

### Requirement: A saved track can hold named markers

The system SHALL let a user save named markers on a saved track. A marker SHALL have a name of 1 to 60 characters and a position in milliseconds in the track's audio time, SHALL be stored with the track in the library, and SHALL persist across restarts. A track SHALL hold at most 200 markers. Markers SHALL be listed in position order, and two markers MAY share a position.

#### Scenario: Add a marker at the playhead

- **WHEN** a track is loaded and the user chooses `Add marker here` at 1:12.4
- **THEN** a marker named `Marker 1` is saved at 1:12.4, a confirmation offers `Rename`, and the marker is present after a restart

#### Scenario: Adding from a loop's list stays inside the loop

- **WHEN** the markers list is opened from a loop and the playhead is outside that loop
- **THEN** `Add marker here` is not offered in the list (it is offered while the playhead is inside the loop, boundaries included), so a new marker is never hidden by the list it was added from

#### Scenario: Automatic names do not collide

- **WHEN** a track has markers `Marker 1` and `Marker 3` and the user adds another
- **THEN** it is named `Marker 2`

#### Scenario: Add a marker by long-pressing the waveform

- **WHEN** the user long-presses the playback waveform at a point that reads 2:05
- **THEN** a marker is added at 2:05 and the playhead does not move

#### Scenario: Rename a marker

- **WHEN** the user chooses `Rename` on a marker and saves a new name
- **THEN** the marker keeps its position and shows the new name, and an empty name is refused

#### Scenario: Move a marker

- **WHEN** the user opens `Move` on a marker and nudges it by +0.1 s, or presses `Set to current position`, or types a time
- **THEN** the marker's position changes accordingly, stays within 0 and the track length when known, and the list reorders

#### Scenario: Delete a marker

- **WHEN** the user chooses `Delete` on a marker
- **THEN** it is removed at once and an undo is offered for a few seconds

#### Scenario: Marker limit

- **WHEN** a track already has 200 markers and the user tries to add another
- **THEN** no marker is added and the user is told the limit

#### Scenario: Malformed stored markers

- **WHEN** a stored record contains a marker with a negative position, a missing name, or a duplicate id
- **THEN** the invalid entries are dropped or repaired when the record is read and the rest load normally

### Requirement: Loops and adjusted tracks share their owner's markers

Markers SHALL belong to the saved track that owns the audio. A loop, and an adjusted copy of the track, SHALL read and edit the owning track's markers rather than keeping their own. Positions SHALL always be in the original audio's time and SHALL NOT change when speed or pitch shaping is applied. A markers list opened for a loop SHALL show only markers within the loop's start and end, inclusive.

#### Scenario: Adjusted track

- **WHEN** a marker exists at 1:00 on a track and the user opens `Markers` on an adjusted copy of it at 0.75× speed
- **THEN** the list shows the marker at 1:00, titled `Markers for <track name>`, and jumping to it plays from 1:00 of the audio

#### Scenario: Loop context

- **WHEN** a track has markers at 0:30, 1:10, and 2:00 and the user opens `Markers` on a loop from 1:00 to 1:30
- **THEN** only the marker at 1:10 is listed, and editing it edits the track's marker

#### Scenario: Owner missing

- **WHEN** the owning track of a loop no longer exists
- **THEN** the loop's `Markers` action is unavailable rather than showing an empty list

### Requirement: Loop start and end points appear as read-only markers that can be filtered out

The markers list SHALL include, for every saved loop of the track (including loops of its adjusted copies), a `<Loop name> start` marker and a `<Loop name> end` marker at the loop's boundaries. These SHALL be computed from the loops, so they update when a loop is edited or renamed and disappear when it is deleted, and SHALL NOT be renamed, moved, or deleted from the markers list. A filter with `All` and `My markers` SHALL be offered; `My markers` hides loop-derived markers. The choice SHALL be remembered on the device and shared by the list, the marker picker, and the waveform flags, and SHALL default to `All`. A loop-derived marker SHALL offer `Open loop` and `Keep as marker`, the latter creating an explicit marker with the same name and position and leaving the loop unchanged.

#### Scenario: Saving a loop adds markers

- **WHEN** the user saves a loop `Verse 2` from 1:00 to 1:30 on a track
- **THEN** the track's list shows `Verse 2 start` at 1:00 and `Verse 2 end` at 1:30 without any other action

#### Scenario: Editing or deleting a loop

- **WHEN** the user moves that loop's start to 1:05, then deletes the loop
- **THEN** the start marker moves to 1:05 and, after deletion, both markers are gone

#### Scenario: Filter to my markers

- **WHEN** the user chooses `My markers`
- **THEN** only explicit markers are listed and drawn on the waveform, and the choice is still `My markers` after a restart

#### Scenario: Keep a loop marker

- **WHEN** the user chooses `Keep as marker` on `Verse 2 start`
- **THEN** an explicit marker named `Verse 2 start` is added at 1:00 and the loop is unchanged

#### Scenario: Derived markers are read-only

- **WHEN** the user opens the row menu of `Verse 2 end`
- **THEN** it offers `Open loop` and `Keep as marker` and no rename, move, or delete

### Requirement: Tapping a marker jumps to it

The markers list SHALL list each marker with its name and time. Tapping a marker SHALL seek to that position when the track, one of its loops, or one of its adjusted copies is the loaded item, keeping the item's play state. Otherwise it SHALL load the item the list was opened from and start playing from that position. In a loop context the position SHALL stay inside the loop, and loop playback SHALL continue. A marker beyond the known track length SHALL be shown greyed with `Past the end of this audio`, SHALL NOT be jumpable, and SHALL NOT be deleted automatically.

#### Scenario: Jump while playing

- **WHEN** the track is playing and the user taps a marker at 2:00
- **THEN** playback continues from 2:00

#### Scenario: Jump while paused

- **WHEN** the track is paused and the user taps a marker
- **THEN** the playhead moves to the marker and the track stays paused

#### Scenario: Start from a marker in the library

- **WHEN** the user opens `Markers` from a track's menu in the library while it is not loaded and taps a marker at 0:45
- **THEN** the track loads and starts playing at 0:45

#### Scenario: Marker past the end

- **WHEN** a track's audio is replaced by a shorter file and a marker lies beyond its end
- **THEN** the marker is listed greyed with the explanation, cannot be jumped to, and can still be moved or deleted

### Requirement: Markers are drawn as flags on the waveform

The playback waveform and the loop editor waveform SHALL draw a flag at each marker in the filtered list: explicit markers as an accent hairline with a small flag, loop-derived markers as a shorter dimmer tick. Flags SHALL carry no permanent labels; pressing one SHALL show its name. Flags closer than 12 pt SHALL be drawn as one. On the playback waveform, tapping a flag SHALL jump to the marker, and long-pressing a flag SHALL open its row actions. Flags SHALL be exposed to assistive technology as buttons named for the marker and its time.

#### Scenario: Flags follow the filter

- **WHEN** the filter is `My markers`
- **THEN** only explicit-marker flags are drawn

#### Scenario: Crowded flags

- **WHEN** two markers lie 3 pt apart on the waveform
- **THEN** one flag is drawn, and both are listed in the markers sheet

### Requirement: Markers are not library entities

Markers SHALL NOT appear as library files, in the Files tree, in search results, in tag or sort controls, in playlists or queues, or in bulk operations. They SHALL appear only in the markers list, the marker picker, and the waveform flags. Removing a track SHALL remove its markers. A Files link copy of a track SHALL show the same markers because it points at the same track.

#### Scenario: Search

- **WHEN** the user searches the library for a marker's name
- **THEN** the marker is not a result

#### Scenario: Remove a track

- **WHEN** the user removes a track from the library
- **THEN** its markers are removed with it
