## ADDED Requirements

### Requirement: Adjusted tracks and loops are ordinary organizable library entities

The system SHALL treat entities created from playback shaping as first-class members of the saved library for browsing, ordering, filtering, tagging, and search, while keeping their source relationship and transform visible.

Companion mockup state: design screen 1j shows an adjusted track in search results with its transform and source in the row.

#### Scenario: Adjusted entities appear in the Files, Tracks, and Loops views

- **WHEN** an adjusted track or loop exists in the saved library
- **THEN** it appears in the Files view alongside other saved entities, and in the Tracks or Loops view according to its kind

#### Scenario: Adjusted entities participate in sort, filter, and search

- **WHEN** a user applies an explicit sort field and direction, an entity-type filter, a tag filter with either match mode, or a library search query
- **THEN** adjusted entities are included on the same terms as saved tracks and loops

#### Scenario: Adjusted entities stay visually distinguishable from their source

- **WHEN** an adjusted entity appears in any list or result row
- **THEN** the row shows its speed and pitch transform and identifies the source item it was derived from

#### Scenario: Adjusted entities group under their source in the file tree

- **WHEN** one or more adjusted entities exist for the same source item
- **THEN** the Files view keeps them associated with that source rather than scattering them as unrelated siblings

#### Scenario: Adjusted entities reach their source's original Drive location

- **WHEN** a user chooses `Show in Add` or `Open in Google Drive` for an adjusted track or loop
- **THEN** the system resolves the current Drive location through the adjusted entity's source track, exactly as it would for that source track

#### Scenario: Bulk Drive import never reuses an adjusted entity as a canonical source

- **WHEN** a bulk Drive import plans reuse for a Drive file that has a saved source track and one or more adjusted entities of that track
- **THEN** the planner matches only the saved source track as the canonical source
- **AND** it does not link, count, or report an adjusted entity as reused or already present

## MODIFIED Requirements

### Requirement: Track-level remove from library is always available and dependency-aware

The system SHALL keep track-level `Remove from library` available from track contexts regardless of active playback or existing organization references, and SHALL require an explicit impact-aware confirmation before removal.

#### Scenario: Remove from library remains available during active playback and active references

- **WHEN** a user opens actions for a saved track that is currently playing, or one of whose loops or adjusted entities is currently playing, and that track has loops or adjusted entities, appears in folders, or appears in playlists
- **THEN** the track-level `Remove from library` action is still available
- **AND** the action is not hidden or disabled because of active playback or those references

#### Scenario: Remove from library confirmation summarizes all affected references

- **WHEN** a user chooses `Remove from library` for a saved track
- **THEN** the system shows a confirmation dialog before applying changes
- **AND** the confirmation summary lists affected dependent data including loops of that track, adjusted tracks and loops made from it, folder links, and playlist entries
- **AND** the user must explicitly confirm before removal occurs

#### Scenario: Remove from library cascades cleanup of track dependencies

- **WHEN** a user confirms `Remove from library` for a saved track
- **THEN** the system removes the track entity from the library
- **AND** the system removes all file links that point to that track
- **AND** the system removes the loops of that track and the adjusted tracks and loops made from it
- **AND** the system removes playlist entries that reference that track or any removed loop or adjusted entity
- **AND** active playback and queue state are updated immediately so removed items are no longer referenced, while playback continues with the next available queue item when possible
