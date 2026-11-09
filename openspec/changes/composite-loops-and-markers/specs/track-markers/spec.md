## ADDED Requirements

### Requirement: Markers can belong to a composite

The system SHALL let the user add, edit and remove markers on a composite, stored on the composite in composite time and shown with it in the playback sheet and waveform. Markers on a stem track SHALL NOT be copied into the composite.

#### Scenario: Adding a marker to a composite

- **WHEN** the user adds a marker at 0:42 while a composite plays
- **THEN** the marker is saved on the composite and appears on its waveform at 0:42

#### Scenario: Stem markers stay on the stem

- **WHEN** a stem track has markers
- **THEN** the composite shows none of them until the user adds its own
