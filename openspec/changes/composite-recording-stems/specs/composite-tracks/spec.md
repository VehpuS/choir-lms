## ADDED Requirements

### Requirement: A recording can be added to a composite as a stem

The system SHALL let the user add a recording as a stem of a composite. The stem SHALL play the recorded audio aligned to the composite's timeline, SHALL have a name, level, mute and solo like any stem, and SHALL be marked as the user's part by default. Deleting the recording SHALL show the stem as missing and SHALL NOT delete the composite.

#### Scenario: Adding a recording

- **WHEN** the user adds a recording made over the Alto track to a composite that contains the Alto track
- **THEN** the composite gains a stem that plays the recording in step with the other stems

#### Scenario: Recording deleted

- **WHEN** the user deletes a recording that is a stem of a composite
- **THEN** the composite shows that stem as missing and the other stems play
