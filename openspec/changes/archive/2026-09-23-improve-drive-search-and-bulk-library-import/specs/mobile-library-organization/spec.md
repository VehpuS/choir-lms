## ADDED Requirements

### Requirement: Drive folder contents can be imported into Library recursively

The system SHALL let a user import supported audio from selected Drive folders into a chosen Library destination either as a flat collection or as a reproduced folder hierarchy.

#### Scenario: Preserve a selected Drive folder hierarchy

- **WHEN** a user imports a selected Drive folder with `Preserve structure` into a Library destination
- **THEN** the system creates a Library folder named after the selected Drive folder under that destination
- **AND** it recreates accessible descendant folders beneath that folder
- **AND** it saves or reuses every supported descendant audio source and links each track into the corresponding reproduced folder

#### Scenario: Flatten a selected Drive folder hierarchy

- **WHEN** a user imports a selected Drive folder with `Flatten` into a Library destination
- **THEN** the system saves or reuses every supported descendant audio source
- **AND** it links those tracks directly into the chosen destination without creating folders from the Drive hierarchy

#### Scenario: Individually selected tracks use the chosen destination

- **WHEN** a bulk selection contains individual Drive audio results not owned by a selected folder import
- **THEN** the system saves or reuses those tracks and links them directly into the chosen Library destination

#### Scenario: Matching folder import includes nonmatching descendants

- **WHEN** a folder was selected from search results because the folder name matched the query
- **THEN** recursive import includes every supported accessible audio source in that folder subtree
- **AND** descendant filenames are not required to match the original search query

### Requirement: Bulk imports reuse canonical sources and normalize overlaps

The system SHALL plan bulk Drive imports by stable Drive identity so overlapping selections and existing saved content do not create duplicate saved sources.

#### Scenario: Selected folder owns selected descendants

- **WHEN** the selection includes a Drive folder and tracks or folders contained by that selected folder
- **THEN** the import plan keeps the highest selected folder as the recursive import root
- **AND** it removes separately selected descendants from duplicate processing
- **AND** the review summary reports the collapsed overlaps

#### Scenario: Already-saved Drive track is reused

- **WHEN** an imported Drive file already exists as a saved Library source with the same Drive file identity
- **THEN** the system reuses that canonical source instead of creating another saved track
- **AND** it adds a missing link in the import destination when needed
- **AND** it reports the track as reused or already present as applicable

#### Scenario: Duplicate visible names are resolved without per-item prompts

- **WHEN** reproduced Drive folders or imported links conflict case-insensitively with names already present in a Library folder
- **THEN** the system applies the Library's keep-both naming convention deterministically
- **AND** the import continues without requiring a separate prompt for every conflict
- **AND** original Drive names and paths remain available through source provenance

#### Scenario: Retrying a partial import is idempotent

- **WHEN** a user retries failed work from a partially completed import
- **THEN** the system replans against current Library state
- **AND** it reuses sources, folders, and links that already completed rather than duplicating them
