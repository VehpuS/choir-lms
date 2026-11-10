## ADDED Requirements

### Requirement: A track can be renamed from the Tracks view

The Tracks view SHALL offer `Rename` in a track's overflow menu. Renaming SHALL change the track's name everywhere it is shown, and Files copies that still carry the track's name SHALL follow it while copies with their own name keep it.

#### Scenario: Rename from Tracks

- **WHEN** a user renames a track from the Tracks overflow menu
- **THEN** the track shows the new name in Tracks and in Files

#### Scenario: A named copy keeps its name

- **WHEN** a track is renamed from Tracks and one copy was given its own name
- **THEN** that copy keeps its own name

### Requirement: Renaming a copy in Files can rename the track

Renaming the only Files copy of a track SHALL also rename the track. When the track has several copies, the system SHALL ask `Rename all copies and the track` or `Rename this copy only` and SHALL let the user remember the answer on this device, after which the prompt is skipped.

#### Scenario: Only copy

- **WHEN** a user renames a track's only copy in Files
- **THEN** the track is renamed too

#### Scenario: Several copies, rename all

- **WHEN** a user chooses to rename all copies
- **THEN** the track and every copy take the new name

#### Scenario: Several copies, rename this one

- **WHEN** a user chooses to rename this copy only
- **THEN** only this copy changes; the track and other copies keep their names

#### Scenario: Remembered choice

- **WHEN** a user turned on `Remember my choice` earlier
- **THEN** the next rename of a multi-copy track applies that choice without asking

#### Scenario: Name clash

- **WHEN** a rename would clash with another item in a copy's folder
- **THEN** nothing is renamed and the user is offered a suggested name
