## ADDED Requirements

### Requirement: Clear all also clears prepared composite stems

The offline files view SHALL list prepared composite stems as a group with their sizes, and `Clear all` SHALL clear them together with the other offline files, with a confirmation that says so. Clearing them SHALL NOT remove any composite, stem track or recording, and a composite whose prepared stems were cleared SHALL prepare them again when next played.

#### Scenario: Prepared composites listed

- **WHEN** the user opens the offline files view and has a prepared composite
- **THEN** a `Prepared composites` group shows it with its size

#### Scenario: Clear all

- **WHEN** the user confirms `Clear all`
- **THEN** prepared stems are cleared along with other offline files, and composites, tracks and recordings remain

#### Scenario: Playing after clearing

- **WHEN** the user plays a composite whose prepared stems were cleared
- **THEN** the system prepares them again, with the first-play state
