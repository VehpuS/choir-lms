## ADDED Requirements

### Requirement: A loop can belong to a composite

The system SHALL let the user save a loop on a composite, storing it against the composite with its range in composite time, and SHALL play it as the same range of the mix. A composite's loops SHALL be listed with the composite and in the Loops view like a track's, and deleting the composite SHALL delete them.

#### Scenario: Saving a loop while a composite plays

- **WHEN** the user saves a loop from 1:05 to 1:35 while a composite plays
- **THEN** the loop belongs to the composite and playing it repeats 1:05 to 1:35 of the mix

#### Scenario: Deleting the composite

- **WHEN** the user deletes a composite that has loops
- **THEN** its loops are removed and the stem tracks' own loops are unchanged
