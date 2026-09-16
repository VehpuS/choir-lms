## ADDED Requirements

### Requirement: Drive discovery searches folders and audio across the complete active subtree

The system SHALL search accessible Google Drive folders and supported audio files throughout the currently selected Add root or folder subtree and SHALL distinguish complete results from unavailable discovery.

#### Scenario: Folder-scoped search includes nested folder and audio matches

- **WHEN** a connected user searches from a Drive folder in Add
- **THEN** the system returns matching accessible folders and supported audio files from that folder and all accessible descendant folders
- **AND** each result identifies its entity type and containing Drive path
- **AND** results outside the active folder subtree are excluded

#### Scenario: Root-scoped search uses the selected Drive root

- **WHEN** a connected user searches from the My Drive or Shared folders root
- **THEN** the system searches the complete selected root rather than mixing results from a different Drive root
- **AND** each result shows enough root and path context to distinguish similarly named items

#### Scenario: Search and browse consume every Drive result page

- **WHEN** a Drive browse, search, descendant-folder discovery, or recursive folder enumeration has more results than one Drive API page
- **THEN** the system follows pagination until every accessible matching item is included
- **AND** the system does not describe a first-page subset as the complete result set

#### Scenario: Search presents path-aware results progressively

- **WHEN** a Drive search requires multiple result pages or ancestry lookups
- **THEN** the system presents each cumulative batch after that batch's containing paths resolve
- **AND** it continues to identify the search as loading until complete discovery finishes
- **AND** opening a folder result reconstructs the full accessible root-to-folder breadcrumb path

#### Scenario: Return from a browsed folder to its search results

- **WHEN** a user opens a folder from Drive search results
- **THEN** the folder browser provides a direct `Search results` action distinct from parent-folder back navigation
- **AND** invoking it restores the originating query, Drive root or folder scope, and latest result set
- **AND** the return action is removed after the search context is restored
- **AND** clearing or replacing the search or selecting another Drive root discards the suspended return context

#### Scenario: Complete discovery cannot be obtained

- **WHEN** a later Drive page or required descendant lookup fails before a complete result set is available
- **THEN** the system reports that discovery is incomplete
- **AND** it may retain already resolved partial results for review
- **AND** the system does not enable a complete-set bulk action against the partial data as though it represented all matches

### Requirement: Saved Drive tracks retain readable original-folder provenance

The system SHALL preserve available Drive parent-folder identity and path metadata separately from the track's app-owned Library folder placement.

#### Scenario: Saving a discovered track preserves source location

- **WHEN** a user saves a Drive audio result with accessible parent-folder metadata
- **THEN** the saved source retains the parent folder id, parent folder name, Drive root kind, and accessible path segments
- **AND** moving or linking that track elsewhere in Library does not change its recorded Drive source location

#### Scenario: Rediscovery refreshes Drive-owned provenance

- **WHEN** an already-saved Drive track is rediscovered after its Drive folder or path metadata changed
- **THEN** the system refreshes the source's Drive-owned metadata and original-location snapshot
- **AND** it preserves app-owned metadata including tags, tag timestamps, creation time, and Library links

#### Scenario: Legacy saved source has no provenance

- **WHEN** a saved source created before this capability has no original-folder metadata
- **THEN** the system continues to load and play the source under the existing availability rules
- **AND** it omits original-folder actions until Drive rediscovery supplies usable provenance

### Requirement: Users can return to a saved track's original Drive folder

The system SHALL expose a saved track's readable last-known Drive path and provide distinct actions for navigating to the source file's current parent folder inside Choir LMS and opening that current folder in Google Drive. Before either action, the system MUST resolve current file metadata by stable Drive file identity rather than assuming stored parent-folder provenance is still current.

#### Scenario: Show original folder inside Add

- **WHEN** a user chooses `Show in Add` for a saved track with usable source provenance
- **THEN** the system resolves the source file's current accessible parent and ancestry by Drive file id
- **AND** it switches to Add and opens that current parent folder under the resolved Drive root
- **AND** the Add breadcrumb reflects the resolved folder path so the user can browse nearby Drive content

#### Scenario: Open original folder in Google Drive

- **WHEN** a user chooses `Open in Google Drive` for a saved track
- **THEN** the system resolves the source file's current accessible parent by Drive file id
- **AND** it requests that current parent folder's Google Drive URL be opened through the device
- **AND** the destination is the current parent folder rather than only the individual audio file or a stale recorded folder

#### Scenario: Source file moved after it was saved

- **WHEN** current Drive metadata shows that a saved source file moved to a different accessible parent folder
- **THEN** the system refreshes the saved source's parent id, root kind, and path provenance while preserving app-owned metadata and Library links
- **AND** the requested `Show in Add` or `Open in Google Drive` action uses the newly resolved folder
- **AND** subsequent Library presentation shows the refreshed path as the last-known source location

#### Scenario: Current source folder cannot be resolved

- **WHEN** the source file was deleted, became inaccessible, has no accessible parent, or its current parent/path lookup fails
- **THEN** the system keeps the saved track and its last-known path visible
- **AND** the requested folder action reports that the current source location cannot be resolved without discarding the user's current context
- **AND** the system does not silently open the stale last-known parent folder as though it were current
