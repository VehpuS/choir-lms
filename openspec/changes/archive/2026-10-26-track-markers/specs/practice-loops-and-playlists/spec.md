## ADDED Requirements

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
