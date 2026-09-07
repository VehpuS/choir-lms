## ADDED Requirements

### Requirement: Users can shape playback speed without changing pitch

The system SHALL let a user change the playback speed of the active track or loop as a continuous multiplier, and SHALL preserve the original pitch at every speed.

Companion mockup states: design screen 1f shows the collapsed practice row with the active speed value, and screen 1i shows the speed control with its range and the 1.00× detent.

#### Scenario: Speed is adjusted as a continuous multiplier

- **WHEN** a user adjusts the speed control for the active playback item
- **THEN** the system applies a continuous speed multiplier within its supported range, shows the current value in a fixed-width numeric readout such as `0.90×`, provides a detent or snap at `1.00×`, and applies the change without interrupting playback

#### Scenario: Changing speed never changes pitch

- **WHEN** playback speed is set to any value other than `1.00×`
- **THEN** the system preserves the source pitch of the audio

#### Scenario: No pitch-lock control is offered

- **WHEN** a user views any playback, transport, or shaping surface
- **THEN** the system does not present a pitch-lock, pitch-preserve, or equivalent toggle, because pitch preservation is unconditional for speed change and a toggle would have only one state

#### Scenario: Speed carries a named tempo source

- **WHEN** the speed control is visible
- **THEN** the system shows the tempo source in use, offers `multiplier` as the implemented source, and presents any unimplemented sources such as BPM entry or score-follow in a visibly inert state so their eventual arrival does not relocate the control

### Requirement: Users can shape playback pitch in semitone steps without changing tempo

The system SHALL let a user transpose the active track or loop in whole semitones, and SHALL leave tempo unchanged.

Companion mockup states: design screen 1f shows the collapsed pitch readout; screen 1i shows the semitone stepper.

#### Scenario: Pitch is adjusted in semitone steps

- **WHEN** a user adjusts the pitch control for the active playback item
- **THEN** the system transposes playback by whole semitones within its supported range, shows the current offset with an explicit sign and unit such as `−2 st`, and applies the change without interrupting playback

#### Scenario: Changing pitch never changes tempo

- **WHEN** pitch is transposed by any non-zero number of semitones
- **THEN** the system leaves the playback tempo unchanged

#### Scenario: Pitch offset of zero is presented as unshaped

- **WHEN** the pitch offset is zero
- **THEN** the system presents the item as unshaped in pitch rather than showing `0 st` as an active modification

### Requirement: Shaping applies to the session until it is explicitly saved

The system SHALL treat speed and pitch adjustments as ephemeral playback options that affect the current session only, and SHALL make that scope visible.

Companion mockup state: design screen 1i states the session scope directly above the save action.

#### Scenario: Shaping is ephemeral by default

- **WHEN** a user adjusts speed or pitch and does not save the result
- **THEN** the system applies the adjustment to the active item for the current session and does not modify the saved library entity

#### Scenario: The ephemeral scope is stated, not implied

- **WHEN** any non-default shaping is active
- **THEN** the shaping surface states that the settings apply to the session until saved

#### Scenario: Active shaping stays visible outside the shaping surface

- **WHEN** any non-default shaping is active and the user returns to the playback surface or the mini-player
- **THEN** the system shows the active speed and pitch values in the rehearsal context line so a user cannot forget that what they are hearing is shaped

### Requirement: Shaping settings can be committed as a derived track or loop

The system SHALL let a user turn the current shaping settings into a first-class library entity that references its source and carries its transform, so a rehearsal-tested setting is recoverable in a later session.

Companion mockup states: design screen 1i shows the save actions; screen 1j shows a derived track in search results with its transform in the row.

#### Scenario: Shaping can be saved as a derived loop

- **WHEN** the active item is a loop, or a loop range is set, and the user commits the current shaping settings
- **THEN** the system creates a saved derived loop that references the source track, keeps the loop range, stores the speed and pitch transform, and offers a smart default name consistent with existing loop naming

#### Scenario: Shaping can be saved as a derived track

- **WHEN** the active item is a full track and the user commits the current shaping settings
- **THEN** the system creates a saved derived track that references the source track and stores the speed and pitch transform

#### Scenario: Derived entities behave as ordinary library entities

- **WHEN** a derived track or loop exists in the library
- **THEN** it can be played, queued, added to playlists, tagged, filtered by tag, sorted, searched, renamed, and removed exactly as a saved track or loop can

#### Scenario: A derived entity's transform and source stay visible

- **WHEN** a derived entity is shown in any list, result, or queue row
- **THEN** the system shows its speed and pitch transform and identifies its source item, so it is never mistaken for a separate recording

#### Scenario: Derived entities do not require stored audio

- **WHEN** a derived entity is created
- **THEN** the system stores its source reference, range, and transform rather than rendered audio, and applies the transform at playback time
