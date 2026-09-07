## ADDED Requirements

### Requirement: Derived tracks and loops are ordinary organizable library entities

The system SHALL treat entities created from playback shaping as first-class members of the saved library for browsing, ordering, filtering, tagging, and search, while keeping their source relationship and transform visible.

Companion mockup state: design screen 1j shows a derived track in search results with its transform and source in the row.

#### Scenario: Derived entities appear in the Files, Tracks, and Loops views

- **WHEN** a derived track or loop exists in the saved library
- **THEN** it appears in the Files view alongside other saved entities, and in the Tracks or Loops view according to its kind

#### Scenario: Derived entities participate in sort, filter, and search

- **WHEN** a user applies an explicit sort field and direction, an entity-type filter, a tag filter with either match mode, or a library search query
- **THEN** derived entities are included on the same terms as saved tracks and loops

#### Scenario: Derived entities stay visually distinguishable from their source

- **WHEN** a derived entity appears in any list or result row
- **THEN** the row shows its speed and pitch transform and identifies the source item it was derived from

#### Scenario: Derived entities group under their source in the file tree

- **WHEN** one or more derived entities exist for the same source item
- **THEN** the Files view keeps them associated with that source rather than scattering them as unrelated siblings
