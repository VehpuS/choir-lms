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

### Requirement: Library includes a unified Files view with optional folder-based organization

The system SHALL provide a unified Files view for app-owned library entities so users can manage tracks, loops, playlists, and folders in one file-oriented hierarchy while keeping folder usage optional and preserving focused entity browsing.

#### Scenario: Files view manages mixed saved entities

- **WHEN** a user opens the Library Files view
- **THEN** the system shows tracks, loops, playlists, and folders in one unified folder-aware interface
- **AND** those entities can be managed using consistent file-like organization affordances

#### Scenario: Dedicated entity views remain available inside Library

- **WHEN** a user wants to browse only tracks, only loops, or only playlists
- **THEN** the system provides a first-class Library view selector for the unified Files view and dedicated entity views
- **AND** switching views stays inside the Library context rather than routing through a separate destination
- **AND** each dedicated view preserves the current focused UX patterns for that entity type rather than forcing navigation through Files

#### Scenario: User organizes loops in folders by choice

- **WHEN** a user creates or selects a folder for loops
- **THEN** the system places chosen loops into that folder while preserving their parent-track association metadata

#### Scenario: Folder views can surface loops directly

- **WHEN** a folder contains one or more loops
- **THEN** the Files view or a folder result view can display those loops directly without requiring navigation through the parent track first
- **AND** each loop still shows parent-track linkage

#### Scenario: Folderless workflow remains supported

- **WHEN** a user does not use folders
- **THEN** the system continues to support complete rehearsal workflows through dedicated library views, tags, and filters

#### Scenario: Focused track browsing keeps saved loops visible while preserving track entry points

- **WHEN** a user is browsing a focused track-oriented Library view outside explicit search, tag, or folder result contexts
- **THEN** the system keeps a top-level Saved loops section available in that focused browse presentation
- **AND** tracks with loops expose a `View track loops` navigation affordance for parent-track-specific loop management

### Requirement: Loop provenance remains visible in standalone organization result views

The system SHALL preserve and display loop parent-track provenance even when loops appear in standalone search, tag, or folder result groups.

#### Scenario: Standalone loop result shows parent linkage

- **WHEN** a loop is displayed in the Files view, a folder result, a search result, or a tag-filtered list
- **THEN** the system shows that loop's parent track identity so users can recover source context quickly

#### Scenario: Search and organization results keep loops visible as a top-level result category

- **WHEN** library search, tag results, or folder results include loops
- **THEN** the system displays loops in their own visible result category
- **AND** the UI does not require a separate enablement step to surface them there
