## ADDED Requirements

### Requirement: App-owned library search is available as a dedicated search function

The system SHALL provide a dedicated app-library search function for saved rehearsal entities that is separate from Google Drive discovery search.

#### Scenario: Library search returns saved entities only

- **WHEN** a user runs app-library search
- **THEN** the system returns only app-owned saved entities such as tracks, loops, playlists, folders, and tags

#### Scenario: Library search supports quick filtering

- **WHEN** a user narrows app-library search
- **THEN** the system supports filter controls for entity type and availability so users can quickly reduce large result sets

#### Scenario: Library search highlights matched query text in results

- **WHEN** a user runs app-library search with an active non-empty query
- **THEN** each matching library result highlights the text segments that matched the query
- **AND** highlighted segments refresh when filters or query text change so visual emphasis matches the current result set

### Requirement: Library entities support tag-based organization

The system SHALL support tags for app-owned library entities so users can organize rehearsal material by choir part, context, or practice intent.

#### Scenario: Assign tags to saved entities

- **WHEN** a user edits a saved track, loop, or playlist organization metadata
- **THEN** the system allows adding and removing tags without affecting playback semantics

#### Scenario: Loops remain independently taggable in track-context-first browsing

- **WHEN** default Library browsing reaches a loop through its parent track context
- **THEN** the system still allows tags to be assigned directly to that loop
- **AND** the loop keeps those tags when shown in search, tag, or folder results

#### Scenario: Filter by one or more tags

- **WHEN** a user selects one or more tags in library organization controls
- **THEN** the system filters visible saved entities to those matching the selected tags

### Requirement: Lightweight folders are included in the first organization baseline

The system SHALL ship lightweight folder organization alongside tags and filters in the first organization baseline, while keeping folder usage optional for individual users.

#### Scenario: User organizes loops in folders by choice

- **WHEN** a user creates or selects a folder for loops
- **THEN** the system places chosen loops into that folder while preserving their parent-track association metadata

#### Scenario: Folder views can surface loops directly

- **WHEN** a folder contains one or more loops
- **THEN** the folder view can display those loops directly without requiring navigation through the parent track first
- **AND** each loop still shows parent-track linkage

#### Scenario: Folderless workflow remains supported

- **WHEN** a user does not use folders
- **THEN** the system continues to support complete rehearsal workflows through default library collections, tags, and filters

#### Scenario: Default library browsing keeps loops grouped by parent track

- **WHEN** a user is browsing Library outside explicit search, tag, or folder result contexts
- **THEN** the system keeps loop discovery anchored to the parent-track context in the default browse presentation
- **AND** tracks with loops expose a `View track loops` navigation affordance

### Requirement: Loop provenance remains visible in standalone organization result views

The system SHALL preserve and display loop parent-track provenance even when loops appear in standalone search, tag, or folder result groups.

#### Scenario: Standalone loop result shows parent linkage

- **WHEN** a loop is displayed in a folder, search result, or tag-filtered list
- **THEN** the system shows that loop's parent track identity so users can recover source context quickly

#### Scenario: Search and organization results keep loops visible as a top-level result category

- **WHEN** library search, tag results, or folder results include loops
- **THEN** the system displays loops in their own visible result category
- **AND** the UI does not require a separate enablement step to surface them there
