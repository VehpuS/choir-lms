## ADDED Requirements

### Requirement: Derived tracks and loops are usable wherever saved tracks and loops are usable

The system SHALL accept entities created from playback shaping as playable items in every rehearsal flow that accepts a saved track or saved loop.

#### Scenario: Derived entities can be queued and reordered

- **WHEN** a user queues a derived track or loop as next, adds it to the end of the queue, or reorders it
- **THEN** the system treats it exactly as it treats a saved track or saved loop

#### Scenario: Derived entities can be playlist items

- **WHEN** a user adds a derived track or loop to a playlist
- **THEN** it persists as an ordered playlist entry and plays in sequence with ordered, repeat, and shuffle behavior unchanged

#### Scenario: Derived entity playback applies its stored transform

- **WHEN** playback starts for a derived entity
- **THEN** the system applies that entity's stored speed and pitch transform for the duration of its playback, and restores the ambient session shaping when playback moves to an item that carries no transform
