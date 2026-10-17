## ADDED Requirements

### Requirement: Loop boundaries can be picked from markers in the loop editor

The loop editor SHALL let a user select the Start or End field and set it from a marker. Selecting a field SHALL arm it with a visible outline; while armed, tapping a marker flag on the waveform, or pressing `Pick marker` and choosing from the markers list, SHALL set that boundary to the marker's position and disarm the field. Tapping the armed field SHALL disarm it. Picking SHALL NOT change the other boundary. If the result leaves the start at or after the end, the editor SHALL show the existing invalid-range feedback and SHALL NOT allow saving. Markers in the loop editor SHALL be read-only (no add, rename, move, or delete). The loop being edited SHALL NOT contribute its own start and end as markers.

#### Scenario: Pick a start from a flag

- **WHEN** the user taps the Start field and then taps the flag for `Verse 2` at 1:00
- **THEN** the loop start becomes 1:00, the field disarms, and the end is unchanged

#### Scenario: Pick an end from the list

- **WHEN** the user taps the End field, presses `Pick marker`, and chooses `Bridge` at 2:10
- **THEN** the loop end becomes 2:10

#### Scenario: Pick produces an invalid range

- **WHEN** the end is 1:00 and the user picks a start marker at 1:20
- **THEN** the editor shows the invalid-range guidance and `Save loop` stays disabled until the range is corrected

#### Scenario: Markers are read-only here

- **WHEN** the user long-presses the waveform in the loop editor
- **THEN** no marker is added

### Requirement: Markers can become loops

The system SHALL offer three ways to create loops from a track's markers, all using the existing loop validation and saving. `Loop to next marker` on a marker SHALL open the loop editor in create mode with that marker as start and the next marker in the displayed list as end (the track end for the last marker when the length is known), named after the marker. Selecting exactly two markers and pressing `Make loop` SHALL open the editor with the earlier as start and the later as end. `Create loops from markers` SHALL list the sections between consecutive explicit markers, with an `Include intro` option adding an `Intro` section from the start of the track to the first marker (off by default), name each section after its start marker, mark and uncheck sections that equal an existing loop of the track, that are too short to be a valid loop, or that reuse an existing loop name, and, on confirming, save the checked sections as loops. Loop-derived markers SHALL NOT be section boundaries.

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

#### Scenario: Unknown length

- **WHEN** the track's length is unknown
- **THEN** the last section is not offered, and `Loop to next marker` on the last marker is unavailable
