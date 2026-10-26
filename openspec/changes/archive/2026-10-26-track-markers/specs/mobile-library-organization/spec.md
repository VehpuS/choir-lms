## ADDED Requirements

### Requirement: The saved-item menu offers Markers

The shared saved-item menu SHALL include a `Markers` action for tracks, loops, and adjusted tracks, placed after `Sheet music`, with an icon from the shared menu icon map. The action SHALL open the markers list for the owning track (filtered to the loop's range for a loop) and SHALL be unavailable when the owner no longer exists. Playlist, folder, and bulk menus SHALL NOT include it.

#### Scenario: Track menu

- **WHEN** the user opens the menu of a saved track
- **THEN** it includes `Markers` after `Sheet music`

#### Scenario: Loop menu

- **WHEN** the user opens `Markers` from a loop's menu
- **THEN** the list shows only the markers within that loop, titled for the owning track

#### Scenario: Bulk menu

- **WHEN** several items are selected
- **THEN** the bulk menu has no `Markers` action

### Requirement: Markers are internal to a track and are not library files

The system SHALL treat markers as part of a track, not as library entities: they SHALL NOT be nodes in the Files tree, SHALL NOT be searched, tagged, sorted, added to playlists, or included in bulk operations, and SHALL be removed when the owning track is removed.

#### Scenario: Files tree

- **WHEN** a track has markers
- **THEN** the Files tree shows no additional entries for them

#### Scenario: Removing a track

- **WHEN** a track with markers is removed
- **THEN** its markers are removed and no leftover entries appear in any view
